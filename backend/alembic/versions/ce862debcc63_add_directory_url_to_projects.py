"""add directory_url to projects

Revision ID: ce862debcc63
Revises: 7cb46e3fbac9
Create Date: 2026-03-30 15:38:59.486957

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ce862debcc63'
down_revision: Union[str, Sequence[str], None] = '7cb46e3fbac9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('projects', sa.Column('directory_url', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('projects', 'directory_url')
