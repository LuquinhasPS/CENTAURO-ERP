"""
Migration script to migrate team_id data from collaborators to collaborator_teams junction table.
Run this script once after updating the models to N:N relationship.

Usage: python migrate_teams.py
"""
import asyncio
from sqlalchemy import text, inspect
from app.database import engine, Base
from app.models.collaborator_teams import collaborator_teams

async def migrate():
    async with engine.begin() as conn:
        # 1. Create the junction table if it doesn't exist
        print("🔧 Creating junction table 'collaborator_teams' if not exists...")
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Junction table ready.")
        
        # 2. Check if team_id column exists in collaborators table
        def check_column_exists(sync_conn):
            inspector = inspect(sync_conn)
            columns = [col['name'] for col in inspector.get_columns('collaborators')]
            return 'team_id' in columns
        
        has_team_id = await conn.run_sync(check_column_exists)
        
        if not has_team_id:
            print("ℹ️  Column 'team_id' not found in collaborators table. Migration may have already been completed.")
            return
        
        # 3. Migrate data from team_id to junction table
        print("📦 Migrating existing team_id data to junction table...")
        
        # Get all collaborators with team_id
        result = await conn.execute(text("SELECT id, team_id FROM collaborators WHERE team_id IS NOT NULL"))
        rows = result.fetchall()
        
        migrated_count = 0
        for row in rows:
            collaborator_id = row[0]
            team_id = row[1]
            
            # Check if entry already exists
            check = await conn.execute(
                text("SELECT 1 FROM collaborator_teams WHERE collaborator_id = :c_id AND team_id = :t_id"),
                {"c_id": collaborator_id, "t_id": team_id}
            )
            if check.fetchone() is None:
                # Insert into junction table
                await conn.execute(
                    text("INSERT INTO collaborator_teams (collaborator_id, team_id) VALUES (:c_id, :t_id)"),
                    {"c_id": collaborator_id, "t_id": team_id}
                )
                migrated_count += 1
        
        print(f"✅ Migrated {migrated_count} collaborator-team associations.")
        
        # 4. Optional: Remove the team_id column (commented out for safety)
        # print("🗑️ Removing old team_id column...")
        # await conn.execute(text("ALTER TABLE collaborators DROP COLUMN team_id"))
        # print("✅ Column removed.")
        
        print("\n🎉 Migration complete! The team_id column is still in place but will be ignored by the ORM.")
        print("   You can manually drop it later with: ALTER TABLE collaborators DROP COLUMN team_id")

if __name__ == "__main__":
    asyncio.run(migrate())
