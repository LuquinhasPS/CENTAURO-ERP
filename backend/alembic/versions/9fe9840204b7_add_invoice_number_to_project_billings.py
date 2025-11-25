"""add_invoice_number_to_project_billings

Revision ID: 9fe9840204b7
Revises: de11916c12eb
Create Date: 2025-11-25 17:26:57.712814

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9fe9840204b7'
down_revision: Union[str, Sequence[str], None] = 'de11916c12eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
