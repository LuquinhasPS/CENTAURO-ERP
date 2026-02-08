from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings
from app.database import AsyncSessionLocal
from app.models import proposals as models
from app.models import commercial as commercial_models
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.utils.timezone import today_brazil, end_of_day_brazil

# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=settings.USE_CREDENTIALS,
    VALIDATE_CERTS=settings.VALIDATE_CERTS
)

# Default recipient for daily briefing
DEFAULT_BRIEFING_EMAIL = "lucaspsilva_@hotmail.com"

class EmailService:
    def __init__(self):
        self.fm = FastMail(conf)

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
            # Color coding for overdue tasks
            due_color = "#d9534f" if task.get('is_overdue') else "#27ae60"
            due_text = "Atrasada" if task.get('is_overdue') else task.get('due_date', '-')
            
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
                    <a href="http://localhost:5173/commercial" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
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

    async def get_pending_tasks_from_db(self) -> list:
        """
        Busca tarefas pendentes (vencidas ou para hoje) do banco de dados.
        """
        today = today_brazil()
        end_of_day = end_of_day_brazil(today)

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
                .order_by(models.ProposalTask.due_date)
            )

            result = await db.execute(stmt)
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

    async def send_daily_briefing(self, email_to: str = None):
        """
        Envia o resumo diário com tarefas reais do banco de dados.
        """
        recipient = email_to or DEFAULT_BRIEFING_EMAIL
        
        # 1. Get real tasks from database
        tasks = await self.get_pending_tasks_from_db()
        
        print(f"[EmailService] Sending daily briefing to {recipient} with {len(tasks)} tasks")

        # 2. Generate HTML
        html_body = self.create_daily_briefing_html(tasks)

        # 3. Create Message
        message = MessageSchema(
            subject=f"📋 Resumo Diário - {len(tasks)} Tarefas Pendentes",
            recipients=[recipient],
            body=html_body,
            subtype=MessageType.html
        )

        # 4. Send
        await self.fm.send_message(message)
        print(f"[EmailService] Daily briefing sent successfully to {recipient}")
        return {"message": "Email enviado com sucesso!", "tasks_count": len(tasks)}

    async def send_test_email(self, email_to: str):
        """
        Envia um email de teste com dados mockados.
        """
        # 1. Mock Data
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

        # 2. Generate HTML
        html_body = self.create_daily_briefing_html(mock_tasks)

        # 3. Create Message
        message = MessageSchema(
            subject="Teste de Notificação - Daily Briefing",
            recipients=[email_to],
            body=html_body,
            subtype=MessageType.html
        )

        # 4. Send
        await self.fm.send_message(message)
        return {"message": "Email enviado com sucesso!"}

email_service = EmailService()
