import sys
import os
import asyncio

# Thêm thư mục gốc backend vào path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

async def main():
    try:
        from services.redis_service import (
            generate_signed_session_id,
            verify_session_id,
            redis_service
        )
        print("Import successfully!")
    except Exception as e:
        print(f"Import error: {str(e)}")
        return

    # 1. Test Session ID signing & verification
    print("--- 1. Testing Session ID Signing & Verification ---")
    signed_id = generate_signed_session_id()
    print(f"Signed Session ID: {signed_id}")
    
    session_uuid = verify_session_id(signed_id)
    print(f"Verified ID: {session_uuid}")
    
    # Fake/tamper with session ID
    tampered_id = signed_id.replace("a", "b") if "a" in signed_id else signed_id[:-1] + "x"
    verify_tampered = verify_session_id(tampered_id)
    print(f"Verified tampered ID: {verify_tampered} (Expected: None)")
    
    # 2. Test Redis connection & operations
    print("\n--- 2. Testing Redis Operations ---")
    await redis_service.connect()
    print(f"Redis connected state: {redis_service.is_connected}")
    
    if redis_service.is_connected:
        test_session_uuid = "test-session-uuid-123"
        
        # Clear existing
        await redis_service.clear_session(test_session_uuid)
        
        # Save sample messages
        print("Saving messages to Redis...")
        await redis_service.save_message(test_session_uuid, "user", "Hello chatbot!")
        await redis_service.save_message(test_session_uuid, "assistant", "Hello, I am AI.")
        await redis_service.save_message(test_session_uuid, "user", "I have headache.")
        await redis_service.save_message(test_session_uuid, "assistant", "You should take Paracetamol.")
        
        # Get history
        history = await redis_service.get_history(test_session_uuid)
        print(f"Saved messages count: {len(history)}")
        for idx, msg in enumerate(history):
            print(f"  {idx+1}. {msg['role']}: {msg['content']}")
            
        # Test sliding window (10 messages = 5 turns)
        print("\nAdding more messages to test sliding window...")
        for i in range(12):
            await redis_service.save_message(test_session_uuid, "user" if i % 2 == 0 else "assistant", f"Message {i}")
            
        history_trimmed = await redis_service.get_history(test_session_uuid)
        print(f"Messages count after trim: {len(history_trimmed)} (Expected: 10)")
        for idx, msg in enumerate(history_trimmed):
            print(f"  {idx+1}. {msg['role']}: {msg['content']}")
            
        # Clear session
        await redis_service.clear_session(test_session_uuid)
        history_after_clear = await redis_service.get_history(test_session_uuid)
        print(f"Messages count after clear: {len(history_after_clear)} (Expected: 0)")
        
    else:
        print("Redis is offline - System runs in stateless fallback mode!")

if __name__ == "__main__":
    asyncio.run(main())
