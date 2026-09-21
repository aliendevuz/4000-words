"""add stories.unit_id

Revision ID: 1be3e928da03
Revises: 357977ad7907
Create Date: 2026-09-22 01:04:39.979614

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1be3e928da03'
down_revision: Union[str, Sequence[str], None] = '357977ad7907'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('stories') as batch_op:
        batch_op.add_column(sa.Column('unit_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_stories_unit_id', 'units', ['unit_id'], ['id']
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('stories') as batch_op:
        batch_op.drop_constraint('fk_stories_unit_id', type_='foreignkey')
        batch_op.drop_column('unit_id')
