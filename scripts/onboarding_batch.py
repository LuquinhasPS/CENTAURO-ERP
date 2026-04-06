import pandas as pd
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext
import os
import sys
import secrets
import string
import resend

# 1. Setup Password Hashing (Argon2)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def generate_random_password(length=12):
    """Gera uma senha aleatória beeeem bizarra"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for i in range(length))

# 2. Database & Config from .env (or hardcoded for deploy)
DEPLOY_URL = "postgresql+asyncpg://postgres:HdRksQOjchuaJZAytjNIsrZnuWWnWcAZ@centerbeam.proxy.rlwy.net:24604/railway"
EXCEL_PATH = r"c:\Users\Centauro\Meu Canto\GitHub\Centauro\CENTAURO-ERP\Usuarios_para_criar.xlsx"

# Resend Config
RESEND_API_KEY = "re_2m9uzZe8_CiSohoJtSA4V9hCJ5dH8zxiX"
resend.api_key = RESEND_API_KEY
DEFAULT_SENDER = "suporte@centaurotelecom.com.br"
FRONTEND_URL = "https://www1.centaurotelecom.com.br"

async def onboarding_process():
    # Read Excel
    df = pd.read_excel(EXCEL_PATH)
    print(f"Lendo {len(df)} colaboradores do Excel...")
    
    engine = create_async_engine(DEPLOY_URL)
    
    success_count = 0
    skip_count = 0
    error_count = 0

    async with engine.begin() as conn:
        for idx, row in df.iterrows():
            email = str(row[0]).strip().lower()
            matricula = str(row[1]).strip()
            cargo_name = str(row[2]).strip()
            
            if not email or '@' not in email:
                continue

            # SKIP LUCAS (yourself) - to avoid password reset on your active session
            if email == "lucasdasilva@centaurotelecom.com.br":
                print(f"[-] Pulando {email} (Você mesmo)")
                skip_count += 1
                continue

            # Find Collaborator ID
            res_collab = await conn.execute(
                text("SELECT id, name FROM collaborators WHERE registration_number = :m"), 
                {"m": matricula}
            )
            collab = res_collab.one_or_none()
            
            if not collab:
                print(f"[-] Erro: {email} (Matrícula {matricula} não encontrada no banco)")
                error_count += 1
                continue
            
            collab_id, collab_name = collab
            
            # Generate Unique Password
            tmp_password = generate_random_password()
            hashed_pwd = get_password_hash(tmp_password)
            
            # Upsert User
            # If exists, update password. If not, insert.
            res_exists = await conn.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email})
            user_exists = res_exists.one_or_none()
            
            try:
                if user_exists:
                    await conn.execute(
                        text("UPDATE users SET password_hash = :p WHERE email = :e"),
                        {"p": hashed_pwd, "e": email}
                    )
                    action = "Senha Atualizada"
                else:
                    await conn.execute(
                        text("""
                            INSERT INTO users (email, password_hash, role, is_superuser, collaborator_id)
                            VALUES (:email, :pwd, 'VISUALIZADOR', false, :cid)
                        """),
                        {
                            "email": email,
                            "pwd": hashed_pwd,
                            "cid": collab_id
                        }
                    )
                    action = "Usuário Criado"
                
                # SEND EMAIL
                html_body = f"""
                <html>
                    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #3b82f6; margin: 0;">Centauro ERP</h1>
                            <p style="color: #64748b; font-size: 1.1rem; margin-top: 5px;">Seja bem-vindo ao novo centro operacional!</p>
                        </div>
                        
                        <p>Olá, <strong>{collab_name}</strong>,</p>
                        
                        <p>Sua conta no sistema <strong>Centauro ERP</strong> foi habilitada com sucesso. A partir de agora, você poderá acessar o portal para gerenciar suas tarefas e processos.</p>
                        
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 25px 0;">
                            <p style="margin-top: 0;"><strong>Dados de Acesso:</strong></p>
                            <p style="margin-bottom: 5px;"><strong>Site:</strong> <a href="{FRONTEND_URL}" style="color: #3b82f6;">{FRONTEND_URL}</a></p>
                            <p style="margin-bottom: 5px;"><strong>Usuário:</strong> {email}</p>
                            <p style="margin-bottom: 0;"><strong>Senha Temporária:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">{tmp_password}</code></p>
                        </div>
                        
                        <p style="color: #ef4444; font-weight: 600;">⚠️ ATENÇÃO - PRIMEIRO ACESSO:</p>
                        <p>Por favor, ao entrar pela primeira vez, utilize a opção <strong>"Esqueci minha senha"</strong> na página de login para definir uma senha pessoal e segura.</p>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="{FRONTEND_URL}/login" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 1.1rem; display: inline-block;">
                                Acessar Sistema Agora
                            </a>
                        </div>
                        
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                        <p style="font-size: 0.8rem; color: #94a3b8; text-align: center; margin: 0;">
                            Este é um email automático enviado pelo sistema de Onboarding da Centauro Telecom.
                        </p>
                    </body>
                </html>
                """

                email_params = {
                    "from": DEFAULT_SENDER,
                    "to": [email],
                    "subject": "🚀 Bem-vindo ao Centauro ERP! Seus dados de acesso",
                    "html": html_body,
                }
                
                resend.Emails.send(email_params)
                print(f"[+] {action} & Email enviado: {email} ({tmp_password})")
                success_count += 1
                
            except Exception as e:
                print(f"[-] Erro processando {email}: {e}")
                error_count += 1
                
    await engine.dispose()
    
    print("\n--- RESUMO DO ONBOARDING ---")
    print(f"Sucesso (Usuários & Emails): {success_count}")
    print(f"Pulados: {skip_count}")
    print(f"Erros: {error_count}")
    print(f"Total: {success_count + skip_count + error_count}")

if __name__ == "__main__":
    asyncio.run(onboarding_process())
