import pandas as pd
import io
import unicodedata
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.finance import ProjectBilling
from app.models import commercial as commercial_models
from app.schemas import finance as schemas

class TaxService:
    @staticmethod
    async def preview_taxes_import(
        file_content: bytes, 
        filename: str, 
        db: AsyncSession
    ) -> schemas.TaxImportPreviewResponse:
        
        # Helper to remove accents from strings
        def remove_accents(input_str):
            nfkd_form = unicodedata.normalize('NFKD', str(input_str))
            return "".join([c for c in nfkd_form if not unicodedata.combining(c)])
        
        # Determine engine
        if filename.endswith('.xlsx'):
            engine = 'openpyxl'
        elif filename.endswith('.xls'):
            engine = 'xlrd'
        else:
            raise ValueError("Formato não suportado. Use .xlsx ou .xls")
        
        # Read first 20 rows to find the header
        df_preview = pd.read_excel(io.BytesIO(file_content), header=None, nrows=20, engine=engine).astype(str)
        
        header_row_index = 0
        found_header = False
        
        # Keywords to identify the header row
        # We look for a row that contains ("NOTA" OR "NUMERO") AND ("VALOR" OR "EMISSAO" OR "DATA" OR "ICMS")
        for i, row in df_preview.iterrows():
            row_str = " ".join(row.values).upper()
            row_str_norm = remove_accents(row_str)  # Remove accents for matching
            
            has_id = "NOTA" in row_str_norm or "NUMERO" in row_str_norm or "NF" in row_str_norm
            has_ctx = "VALOR" in row_str_norm or "EMISSAO" in row_str_norm or "DATA" in row_str_norm or "CLIENTE" in row_str_norm or "ICMS" in row_str_norm
            
            if has_id and has_ctx:
                header_row_index = i
                found_header = True
                break
        
        # Reload with correct header
        df = pd.read_excel(io.BytesIO(file_content), header=header_row_index, engine=engine)
        
        # Normalize columns: Uppercase, remove accents, remove special chars, single spaces
        def normalize_col(col):
            s = str(col).upper()
            s = s.replace('º', 'O').replace('°', 'O').replace('ª', 'A')  # Ordinal indicators
            s = s.replace('.', ' ').replace('-', ' ').replace('/', ' ')
            s = remove_accents(s)
            return ' '.join(s.split())  # Collapse multiple spaces
        
        df.columns = pd.Index([normalize_col(col) for col in df.columns])
        
        preview_items = []
        logs = []
        found_count = 0
        total_value = 0.0
        
        if found_header:
            logs.append(f"Header identificado na linha {header_row_index + 1}.")
        else:
            logs.append("Header nao identificado claramente. Usando linha 0.")

        logs.append(f"Colunas (Normalizadas): {list(df.columns)}")
        
        # Debug: mostrar colunas que contêm PIS, COFINS ou ISS
        pis_cofins_cols = [c for c in df.columns if 'PIS' in c or 'COFINS' in c or 'ISS' in c.split()]
        logs.append(f"Colunas PIS/COFINS/ISS: {pis_cofins_cols}")
        
        # Iterate over rows
        for index, row in df.iterrows():
            invoice_number = None
            
            # Try to find Invoice Number column (after normalization, º becomes O)
            possible_invoice_cols = [
                'NO NF', 'N NF', 'NF', 'NOTA', 'N NOTA', 'NUMERO', 'NUMERO NF',
                'NUMERO DA NOTA', 'NRO', 'NR NOTA', 'DOCUMENTO', 'NUM NF', 'NUM NOTA'
            ]
            
            for col in possible_invoice_cols:
                if col in df.columns and pd.notna(row[col]):
                    val = str(row[col]).strip()
                    if val and val.lower() not in ['nan', 'none', '']:
                        # Remove .0 from float numbers like "4518.0"
                        if '.' in val:
                            try:
                                invoice_number = str(int(float(val)))
                            except:
                                invoice_number = val
                        else:
                            invoice_number = val
                        break
            
            if not invoice_number:
                continue
            
            # Find Billing in DB
            result = await db.execute(select(ProjectBilling).options(selectinload(ProjectBilling.project).selectinload(commercial_models.Project.client)).where(ProjectBilling.invoice_number == invoice_number))
            billing = result.scalar_one_or_none()
            
            if not billing:
                logs.append(f"Nota {invoice_number} nao encontrada no DB.")
                continue
            
            logs.append(f"Processando Nota {invoice_number} (ID: {billing.id})")

            # Determine Type (Service vs Material)
            is_service = False
            is_material = False
            
            billing_category = billing.category or "SERVICE"
            
            # Heuristics for Service (Look for ISS)
            service_keywords = ['ISS RETIDO', 'VALOR ISS', 'RETENCAO ISS', 'RETENCOES', 'VLR ISS', 'VI ISS', 'VL ISS', 'VALOR DO ISS', 'ISS VALOR RETIDO', 'ISS VALOR', 'ISS ALIQUOTA']
            if any(k in df.columns for k in service_keywords):
                is_service = True
                logs.append(f"  -> Arquivo detectado como SERVIÇO (encontrou colunas ISS)")
            
            # Heuristics for Material (Look for ICMS/IPI)
            material_keywords = ['ICMS', 'VALOR ICMS', 'IPI', 'VALOR IPI', 'VLR ICMS', 'VI ICMS', 'VL ICMS', 'VI IPI', 'VL IPI', 'VL ICMS TOTAL']
            if any(k in df.columns for k in material_keywords):
                is_material = True
                logs.append(f"  -> Arquivo detectado como MATERIAL (encontrou colunas ICMS/IPI)")
                
            # Default to existing category if ambiguous or if neither was detected
            if not is_service and not is_material:
                logs.append(f"  -> Tipo não detectado automaticamente, usando categoria existente: {billing_category}")
                if billing.category == "MATERIAL":
                    is_material = True
                elif billing.category == "SERVICE":
                    is_service = True
            elif is_service and is_material:
                # Both detected - use existing category
                logs.append(f"  -> Ambos tipos detectados, usando categoria existente: {billing_category}")
                if billing.category == "MATERIAL":
                    is_service = False
                else:
                    is_material = False
            
            # Helper to safely get float
            def get_val(keywords):
                for col in df.columns:
                    if col in keywords:
                        if pd.notna(row[col]):
                            try:
                                return float(row[col])
                            except:
                                pass
                return 0.0

            # Prepare Update Dict
            update_data = {}
            
            if is_service:
                update_data["category"] = "SERVICE"
                
                # ==== IMPOSTOS RETIDOS (Cliente desconta e paga ao governo) ====
                # PIS Retido (coluna R)
                update_data["retention_pis"] = get_val(['VALOR PIS RETIDO', 'PIS RETIDO', 'VI PIS RETIDO', 'VL PIS RETIDO'])
                # COFINS Retido (coluna U)
                update_data["retention_cofins"] = get_val(['VALOR COFINS RETIDO', 'COFINS RETIDO', 'VI COFINS RETIDO', 'VL COFINS RETIDO'])
                # CSLL Retido (coluna X)
                update_data["retention_csll"] = get_val(['VALOR CSSL RETIDO', 'VALOR CSLL RETIDO', 'CSLL RETIDO', 'VI CSLL RETIDO', 'VL CSLL RETIDO'])
                # INSS Retido (coluna Y)
                update_data["retention_inss"] = get_val(['VALOR INSS RETIDO', 'INSS RETIDO', 'VI INSS RETIDO', 'VL INSS RETIDO'])
                # IRRF Retido (coluna AB)
                update_data["retention_irrf"] = get_val(['VALOR IRRF RETIDO', 'IRRF RETIDO', 'VI IRRF RETIDO', 'VL IRRF RETIDO'])
                
                # ISS - lógica especial
                iss_valor_retido = get_val(['ISS VALOR RETIDO', 'ISS RETIDO'])  # Coluna O - flag
                iss_valor = get_val(['ISS VALOR', 'VALOR ISS'])  # Coluna N - valor
                if iss_valor_retido > 0:
                    update_data["retention_iss"] = iss_valor
                    update_data["tax_iss"] = 0.0
                else:
                    update_data["retention_iss"] = 0.0
                    update_data["tax_iss"] = iss_valor
                
                # ==== IMPOSTOS NÃO RETIDOS (Empresa paga ao governo) ====
                # PIS a pagar (não retido)
                update_data["tax_pis"] = get_val(['VALOR PIS'])
                # COFINS a pagar (não retido)
                update_data["tax_cofins"] = get_val(['VALOR COFINS'])
                # IRPJ a pagar (não retido)
                update_data["tax_irpj"] = get_val(['VALOR IRPJ', 'VLR IRPJ', 'IRPJ', 'IRPJ A PAGAR'])
                
                # ==== VALOR BRUTO / TOTAL ====
                excel_total = get_val(['TOTAL', 'VALOR TOTAL', 'VLR TOTAL', 'VALOR BRUTO', 'VALOR SERVICO', 'VLR SERVICO', 'VALOR DA NOTA', 'VALOR CONTABIL', 'VL CONTABIL'])
                
                gross_value = float(billing.gross_value or 0)
                if excel_total > 0 and (gross_value == 0 or billing.gross_value is None):
                        gross_value = excel_total
                update_data["gross_value"] = gross_value
                
                # ==== VALOR LÍQUIDO (CALCULADO) ====
                total_retentions = (
                    (update_data.get("retention_iss", 0) or 0) + 
                    (update_data.get("retention_inss", 0) or 0) + 
                    (update_data.get("retention_irrf", 0) or 0) + 
                    (update_data.get("retention_csll", 0) or 0) + 
                    (update_data.get("retention_pis", 0) or 0) + 
                    (update_data.get("retention_cofins", 0) or 0)
                )
                
                net_value = gross_value - total_retentions
                update_data["net_value"] = net_value
                update_data["taxes_verified"] = True
                
                logs.append(f"  -> LIQUIDO (soma): {gross_value} - {total_retentions} = {net_value}")

            elif is_material:
                update_data["category"] = "MATERIAL"
                
                update_data["tax_icms"] = get_val(['ICMS', 'VALOR ICMS', 'VLR ICMS', 'VI ICMS', 'VL ICMS', 'VL ICMS TOTAL'])
                update_data["tax_ipi"] = get_val(['IPI', 'VALOR IPI', 'VLR IPI', 'VI IPI', 'VL IPI'])
                update_data["value_st"] = get_val(['ST', 'VALOR ST', 'SUBST TRIBUTARIA', 'VI ST', 'VL ST', 'VALOR ST'])
                
                update_data["retention_pis"] = get_val(['PIS', 'VI PIS', 'VL PIS', 'TOTAL PIS', 'TOTAL PIS TOTAL', 'VALOR PIS'])
                update_data["retention_cofins"] = get_val(['COFINS', 'VI COFINS', 'VL COFINS', 'TOTAL COFINS', 'VALOR COFINS'])
                
                excel_gross = get_val(['VALOR BRUTO', 'VALOR PRODUTOS', 'VALOR DA NOTA', 'VALOR CONTABIL', 'VL CONTABIL'])
                
                gross_value = float(billing.gross_value or 0)
                if excel_gross > 0 and (gross_value == 0 or billing.gross_value is None):
                        gross_value = excel_gross
                update_data["gross_value"] = gross_value
                
                # Para Material: Valor Líquido = Bruto - (ICMS + PIS + COFINS)
                total_taxes = update_data["tax_icms"] + update_data["retention_pis"] + update_data["retention_cofins"]
                net_value = gross_value - total_taxes 
                update_data["net_value"] = net_value
                update_data["taxes_verified"] = True
            
            # Build Preview Item
            item = schemas.TaxImportItem(
                billing_id = billing.id,
                invoice_number = invoice_number,
                project_tag = billing.project.tag if billing.project else "N/A",
                client_name = billing.project.client.name if billing.project and billing.project.client else "N/A",
                category = update_data.get("category", "SERVICE"),
                gross_value = update_data.get("gross_value", 0.0),
                net_value = update_data.get("net_value", 0.0),
                diff_gross = update_data.get("gross_value", 0.0) - float(billing.gross_value or 0),
                diff_net = update_data.get("net_value", 0.0) - float(billing.net_value or 0),
                updates = update_data
            )
            
            preview_items.append(item)
            found_count += 1
            total_value += item.gross_value
            
        
        # Limit logs for response
        if len(logs) > 30:
            logs = logs[:15] + ["... (logs truncados) ..."] + logs[-5:]
            
        return schemas.TaxImportPreviewResponse(
            items=preview_items,
            found_count=found_count,
            total_value=total_value,
            logs=logs
        )
