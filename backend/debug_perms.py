import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import engine, AsyncSessionLocal
from app.models.users import User
from app.models.operational import Collaborator
from app.models.roles import Role

async def check_user_perms():
    async with engine.connect() as conn:
        # We need an AsyncSession or just use raw queries/async engine properly
        from sqlalchemy.ext.asyncio import AsyncSession
        async_session = AsyncSession(engine)
        
        async with async_session as session:
            # 1. Look for the user
            print("--- Searching for User ---")
            query = select(User).options(
                selectinload(User.collaborator).selectinload(Collaborator.role_obj)
            ).filter(User.email.ilike("lucas%"))
            result = await session.execute(query)
            users = result.scalars().all()
            
            for u in users:
                print(f"User: ID={u.id}, Email={u.email}, Role={u.role}, Superuser={u.is_superuser}, CollabID={u.collaborator_id}")
                if u.collaborator:
                    print(f"  Linked Collaborator: {u.collaborator.name}")
                    if u.collaborator.role_obj:
                        print(f"    Role: {u.collaborator.role_obj.name}")
                        print(f"    Permissions: {u.collaborator.role_obj.permissions}")
                    else:
                        print(f"    Role: NONE (role_id={u.collaborator.role_id})")
                else:
                    print(f"  Linked Collaborator: NONE")
                print(f"  Calculated Permissions: {u.permissions}")
                print("-" * 20)

            # 2. Look for the collaborator
            print("\n--- Searching for Collaborator 'lucas pereira da silva' ---")
            query = select(Collaborator).options(selectinload(Collaborator.role_obj)).filter(Collaborator.name.ilike("%lucas pereira%"))
            result = await session.execute(query)
            collabs = result.scalars().all()
            
            for c in collabs:
                print(f"Collab: ID={c.id}, Name={c.name}, Email={c.email}, RoleID={c.role_id}")
                if c.role_obj:
                    print(f"  Role: {c.role_obj.name}")
                    print(f"  Permissions: {c.role_obj.permissions}")
                else:
                    print(f"  Role: NONE")
                print("-" * 20)
            
            # 3. List all roles
            print("\n--- All Roles ---")
            query = select(Role)
            result = await session.execute(query)
            roles = result.scalars().all()
            for r in roles:
                print(f"Role: ID={r.id}, Name={r.name}, Permissions={r.permissions}")

if __name__ == "__main__":
    asyncio.run(check_user_perms())
