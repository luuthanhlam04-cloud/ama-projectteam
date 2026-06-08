import httpx
import json

BASE_URL = "http://localhost:8000/api/chat"

def print_result(step_name, success, info=""):
    status = "SUCCESS" if success else "FAILED"
    print(f"[{status}] {step_name} - {info}")

async def test_integration():
    client = httpx.AsyncClient()
    session_id = None

    # Step 1: Send first message and establish session
    print("\n=== STEP 1: Sending first message (establish session) ===")
    try:
        response = await client.post(
            BASE_URL,
            json={"text": "Tôi bị đau đầu, trong tủ thuốc có Panadol Extra không?"}
        )
        if response.status_code == 200:
            data = response.json()
            session_id = data.get("session_id")
            header_session_id = response.headers.get("X-Session-ID")
            cookie_session_id = response.cookies.get("session_id")
            
            print_result("Establish Session", session_id is not None, f"Session ID in JSON: {session_id}")
            print_result("Response Header", header_session_id == session_id, f"X-Session-ID Header: {header_session_id}")
            print_result("Response Cookie", cookie_session_id == session_id, f"Cookie session_id: {cookie_session_id}")
            print(f"Bot reply: {data.get('bot_reply')[:150]}...")
            print(f"Matched images: {[img['brand_name'] for img in data.get('matched_images', [])]}")
        else:
            print_result("Establish Session", False, f"HTTP Status: {response.status_code}, Body: {response.text}")
            return
    except Exception as e:
        import traceback
        traceback.print_exc()
        print_result("Establish Session", False, str(e))
        return

    # Step 2: Send second message with session ID (context test)
    print("\n=== STEP 2: Sending follow-up message (context test) ===")
    if not session_id:
        print("Skipping Step 2 because Session ID is missing.")
        return
        
    try:
        response = await client.post(
            BASE_URL,
            json={"text": "Tôi nên uống thuốc đó như thế nào và liều dùng bao nhiêu?"},
            headers={"X-Session-ID": session_id}
        )
        if response.status_code == 200:
            data = response.json()
            print_result("Follow-up context", "panadol" in data.get("bot_reply").lower() or "đó" in data.get("bot_reply").lower(), "AI understood past reference.")
            print(f"Bot reply: {data.get('bot_reply')[:150]}...")
        else:
            print_result("Follow-up context", False, f"HTTP Status: {response.status_code}")
    except Exception as e:
        print_result("Follow-up context", False, str(e))

    # Step 3: Test contraindication image filtering
    print("\n=== STEP 3: Test pregnancy contraindication image filtering (Decolgen) ===")
    try:
        # Decolgen is contraindicated during pregnancy. RAG should retrieve Decolgen information,
        # but the image filtering logic in chat.py should remove Decolgen's image from matched_images
        # because the AI warns against using it.
        response = await client.post(
            BASE_URL,
            json={"text": "Tôi đang mang thai, uống Decolgen được không?"},
            headers={"X-Session-ID": session_id}
        )
        if response.status_code == 200:
            data = response.json()
            bot_reply = data.get("bot_reply", "")
            matched_images = data.get("matched_images", [])
            decolgen_image_sent = any("decolgen" in img["brand_name"].lower() for img in matched_images)
            
            print(f"Bot reply: {bot_reply[:150]}...")
            print(f"Matched images: {[img['brand_name'] for img in matched_images]}")
            print_result("Contraindication warning in text", "không nên" in bot_reply.lower() or "không dùng" in bot_reply.lower() or "thai" in bot_reply.lower(), "AI gave warning.")
            print_result("Decolgen Image Filtered Out", not decolgen_image_sent, "Decolgen image was filtered out as expected.")
        else:
            print_result("Contraindication test", False, f"HTTP Status: {response.status_code}")
    except Exception as e:
        print_result("Contraindication test", False, str(e))

    # Step 4: Clear session
    print("\n=== STEP 4: Test clear session endpoint ===")
    try:
        response = await client.post(
            f"{BASE_URL}/clear-session",
            headers={"X-Session-ID": session_id}
        )
        if response.status_code == 200:
            data = response.json()
            print_result("Clear session response", data.get("status") == "success", data.get("message"))
            
            # Verify it is deleted by asking a follow-up that relies on past context
            response_after = await client.post(
                BASE_URL,
                json={"text": "Liều dùng của thuốc đó là bao nhiêu?"},
                headers={"X-Session-ID": session_id}
            )
            data_after = response_after.json()
            # Since history was cleared, AI won't know what "thuốc đó" refers to,
            # or it should not have the previous context.
            print(f"Bot reply after clear: {data_after.get('bot_reply')[:150]}...")
            print_result("Verify History Cleared", "không rõ" in data_after.get('bot_reply').lower() or "thuốc nào" in data_after.get('bot_reply').lower() or "tủ" in data_after.get('bot_reply').lower(), "AI lost past reference.")
        else:
            print_result("Clear session", False, f"HTTP Status: {response.status_code}")
    except Exception as e:
        print_result("Clear session", False, str(e))

    await client.aclose()

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_integration())
