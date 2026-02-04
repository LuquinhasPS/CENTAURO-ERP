"""
Centralized message strings for CENTAURO ERP API.
Portuguese error messages for consistent user-facing responses.
"""


class Msg:
    """Standardized Portuguese messages for API responses."""
    
    # ============================================
    # GENERIC CRUD MESSAGES
    # ============================================
    NOT_FOUND = "Registro não encontrado."
    CREATED = "Registro criado com sucesso."
    UPDATED = "Registro atualizado com sucesso."
    DELETED = "Registro excluído com sucesso."
    
    # ============================================
    # AUTHORIZATION
    # ============================================
    UNAUTHORIZED = "Operação não permitida."
    INVALID_CREDENTIALS = "Credenciais inválidas."
    TOKEN_EXPIRED = "Sessão expirada. Faça login novamente."
    PERMISSION_DENIED = "Permissão negada."
    
    # ============================================
    # PROJECT MESSAGES
    # ============================================
    PROJECT_NOT_FOUND = "Projeto não encontrado."
    PROJECT_ALREADY_EXISTS = "Já existe um projeto com essa tag."
    PROJECT_CREATED = "Projeto criado com sucesso."
    PROJECT_UPDATED = "Projeto atualizado com sucesso."
    PROJECT_DELETED = "Projeto excluído com sucesso."
    
    # ============================================
    # CLIENT MESSAGES
    # ============================================
    CLIENT_NOT_FOUND = "Cliente não encontrado."
    CLIENT_ALREADY_EXISTS = "Já existe um cliente com esse CNPJ."
    CLIENT_CREATED = "Cliente criado com sucesso."
    CLIENT_UPDATED = "Cliente atualizado com sucesso."
    CLIENT_DELETED = "Cliente excluído com sucesso."
    CLIENT_HAS_PROJECTS = "Não é possível excluir cliente com projetos vinculados."
    
    # ============================================
    # CONTRACT MESSAGES
    # ============================================
    CONTRACT_NOT_FOUND = "Contrato não encontrado."
    CONTRACT_CREATED = "Contrato criado com sucesso."
    CONTRACT_UPDATED = "Contrato atualizado com sucesso."
    CONTRACT_DELETED = "Contrato excluído com sucesso."
    
    # ============================================
    # COLLABORATOR MESSAGES
    # ============================================
    COLLABORATOR_NOT_FOUND = "Colaborador não encontrado."
    COLLABORATOR_CREATED = "Colaborador cadastrado com sucesso."
    COLLABORATOR_UPDATED = "Colaborador atualizado com sucesso."
    COLLABORATOR_DELETED = "Colaborador excluído com sucesso."
    
    # ============================================
    # VEHICLE MESSAGES
    # ============================================
    VEHICLE_NOT_FOUND = "Veículo não encontrado."
    VEHICLE_CREATED = "Veículo cadastrado com sucesso."
    VEHICLE_UPDATED = "Veículo atualizado com sucesso."
    VEHICLE_DELETED = "Veículo excluído com sucesso."
    
    # ============================================
    # PURCHASE MESSAGES
    # ============================================
    PURCHASE_NOT_FOUND = "Solicitação de compra não encontrada."
    PURCHASE_CREATED = "Solicitação criada com sucesso."
    PURCHASE_APPROVED = "Solicitação aprovada com sucesso."
    PURCHASE_REJECTED = "Solicitação rejeitada."
    PURCHASE_ALREADY_APPROVED = "Esta solicitação já foi aprovada."
    PURCHASE_ALREADY_REJECTED = "Esta solicitação já foi rejeitada."
    
    # ============================================
    # BILLING MESSAGES
    # ============================================
    BILLING_NOT_FOUND = "Faturamento não encontrado."
    BILLING_CREATED = "Faturamento registrado com sucesso."
    BILLING_DELETED = "Faturamento excluído com sucesso."
    
    # ============================================
    # VALIDATION ERRORS
    # ============================================
    INVALID_DATE = "Data inválida."
    INVALID_VALUE = "Valor inválido."
    REQUIRED_FIELD = "Campo obrigatório não preenchido."
    DUPLICATE_ENTRY = "Registro duplicado."
