import resend
from app.core.config import settings
from app.database import AsyncSessionLocal
from app.models import proposals as models
from app.models import commercial as commercial_models
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_
from app.utils.timezone import today_brazil, end_of_day_brazil

# Configure Resend API key
resend.api_key = settings.RESEND_API_KEY

# Default sender and recipients
DEFAULT_SENDER = settings.MAIL_FROM or "onboarding@resend.dev"
DEFAULT_BRIEFING_EMAIL = "comercial@centaurotelecom.com.br"
ENGINEERING_BRIEFING_EMAIL = "engenharia@centaurotelecom.com.br"


class EmailService:
    def create_daily_briefing_html(self, tasks: list) -> str:
        """
        Gera o corpo do email em HTML com uma tabela de tarefas.
        """
        if not tasks:
            return """
            <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #2c3e50;">Resumo Diário - Centauro ERP</h2>
                    <p>Olá,</p>
                    <p style="color: #27ae60;">🎉 Parabéns! Você não tem tarefas pendentes para hoje.</p>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">
                        Este é um email automático do sistema Centauro ERP.
                    </p>
                </body>
            </html>
            """

        rows = ""
        for task in tasks:
            due_color = "#d9534f" if task.get('is_overdue') else "#27ae60"
            due_text = task.get('due_date', '-')

            rows += f"""
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">{task.get('client_name', 'N/A')}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">{task.get('proposal_title', '-')}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">{task.get('title', '-')}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: {due_color}; font-weight: bold;">{due_text}</td>
            </tr>
            """

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #2c3e50;">📋 Resumo Diário - Centauro ERP</h2>
                <p>Olá,</p>
                <p>Aqui estão as suas <strong>{len(tasks)} tarefas</strong> pendentes para hoje:</p>

                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #3498db; color: white;">
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Cliente</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Proposta</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Tarefa</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Vencimento</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>

                <p>
                    <a href="https://centauro-erp.vercel.app/commercial" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Acessar CRM
                    </a>
                </p>

                <p style="margin-top: 30px; font-size: 12px; color: #777;">
                    Este é um email automático do sistema Centauro ERP.
                </p>
            </body>
        </html>
        """
        return html

    async def get_pending_tasks_from_db(self, department: str = "COMERCIAL") -> list:
        """
        Busca tarefas pendentes (vencidas ou para hoje) do banco de dados.
        Filtra pelo departamento ('COMERCIAL' ou 'ENGENHARIA').
        """
        today = today_brazil()
        end_of_day = end_of_day_brazil(today).replace(tzinfo=None)  # Make naive for PostgreSQL

        async with AsyncSessionLocal() as db:
            stmt = (
                select(models.ProposalTask)
                .join(models.CommercialProposal)
                .options(
                    selectinload(models.ProposalTask.proposal).selectinload(models.CommercialProposal.client)
                )
                .where(
                    models.ProposalTask.is_completed == False,
                    models.ProposalTask.due_date <= end_of_day
                )
            )

            # Department Filtering
            if department == "COMERCIAL":
                stmt = stmt.where(
                    or_(
                        models.CommercialProposal.crm_department == "COMERCIAL",
                        models.CommercialProposal.crm_department.is_(None)
                    )
                )
            else:
                stmt = stmt.where(models.CommercialProposal.crm_department == department)

            result = await db.execute(stmt.order_by(models.ProposalTask.due_date))
            tasks = result.scalars().all()

            response = []
            for task in tasks:
                proposal = task.proposal
                client_name = proposal.client_name
                if not client_name and proposal.client:
                    client_name = proposal.client.name
                if not client_name:
                    client_name = "N/A"

                is_overdue = task.due_date.date() < today

                response.append({
                    "id": task.id,
                    "title": task.title,
                    "due_date": task.due_date.strftime("%d/%m/%Y"),
                    "proposal_id": proposal.id,
                    "proposal_title": proposal.title,
                    "client_name": client_name,
                    "is_overdue": is_overdue
                })

            return response

    async def send_daily_briefing(self, email_to: str = None, department: str = "COMERCIAL"):
        """
        Envia o resumo diário com tarefas reais do banco de dados via Resend.
        """
        # Determine recipient and label
        dept_label = "Engenharia" if department == "ENGENHARIA" else "Comercial"
        recipient = email_to or (ENGINEERING_BRIEFING_EMAIL if department == "ENGENHARIA" else DEFAULT_BRIEFING_EMAIL)

        # 1. Get real tasks from database for this department
        tasks = await self.get_pending_tasks_from_db(department=department)

        print(f"[EmailService] Sending daily briefing to {recipient} with {len(tasks)} tasks")

        # 2. Generate HTML
        html_body = self.create_daily_briefing_html(tasks)

        # 3. Send via Resend
        params = {
            "from": DEFAULT_SENDER,
            "to": [recipient],
            "subject": f"📋 [{dept_label}] Resumo Diário - {len(tasks)} Tarefas Pendentes",
            "html": html_body,
        }

        response = resend.Emails.send(params)
        print(f"[EmailService] Daily briefing sent successfully to {recipient}: {response}")
        return {"message": "Email enviado com sucesso!", "tasks_count": len(tasks), "resend_id": response.get("id")}

    async def send_test_email(self, email_to: str):
        """
        Envia um email de teste com dados mockados via Resend.
        """
        mock_tasks = [
            {
                "client_name": "Cliente A - Telecom",
                "proposal_title": "Projeto Fibra Óptica SP",
                "title": "Ligar para confirmar reunião",
                "due_date": "Hoje",
                "is_overdue": False
            },
            {
                "client_name": "Construtora XYZ",
                "proposal_title": "Instalação Elétrica Galpão",
                "title": "Enviar orçamento revisado",
                "due_date": "Ontem",
                "is_overdue": True
            }
        ]

        html_body = self.create_daily_briefing_html(mock_tasks)

        params = {
            "from": DEFAULT_SENDER,
            "to": [email_to],
            "subject": "Teste de Notificação - Daily Briefing",
            "html": html_body,
        }

        response = resend.Emails.send(params)
        return {"message": "Email enviado com sucesso!", "resend_id": response.get("id")}


    async def send_password_reset_email(self, email_to: str, token: str):
        """
        Envia o email com o link de redefinição de senha.
        """
        # A URL oficial do sistema
        frontend_url = "https://www1.centaurotelecom.com.br" 
        reset_link = f"{frontend_url}/reset-password?token={token}"

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Recuperação de Senha - Centauro ERP</h2>
                    <p>Olá,</p>
                    <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema <strong>Centauro ERP</strong>.</p>
                    <p>Para prosseguir, clique no botão abaixo:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            Redefinir Minha Senha
                        </a>
                    </div>
                    <p style="font-size: 0.85rem; color: #64748b;">
                        Este link expirará em 1 hora por motivos de segurança. 
                        Se você não solicitou esta alteração, pode ignorar este email com segurança.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 0.8rem; color: #94a3b8; text-align: center;">
                        Este é um email automático do sistema Centauro ERP.
                    </p>
                </div>
            </body>
        </html>
        """

        params = {
            "from": DEFAULT_SENDER,
            "to": [email_to],
            "subject": "🔑 Recuperação de Senha - Centauro ERP",
            "html": html_body,
        }

        try:
            response = resend.Emails.send(params)
            print(f"[EmailService] Reset email sent to {email_to}: {response}")
            return True
        except Exception as e:
            print(f"[EmailService] ERROR sending reset email: {e}")
            return False

email_service = EmailService()
