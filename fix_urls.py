import os
import re

config_content = '''export const getApiBaseUrl = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : self.location.hostname;
  return 'http://' + hostname + ':8000';
};
export const API_BASE_URL = getApiBaseUrl();
'''
with open('frontend/src/config.ts', 'w') as f:
    f.write(config_content)

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Determine relative path to config.ts
    depth = len(filepath.split('/')) - 3
    rel_path = '../' * depth + 'config' if depth > 0 else './config'

    # Special handling for ChatbotAI.tsx
    if 'ChatbotAI.tsx' in filepath:
        content = content.replace('const BASE_URL = "http://localhost:8000";', 'import { API_BASE_URL } from "../config";\nconst BASE_URL = API_BASE_URL;')
        content = content.replace("'http://localhost:8000/api/chat'", '`${API_BASE_URL}/api/chat`')
        content = content.replace("'http://localhost:8000/api/chat/clear-session'", '`${API_BASE_URL}/api/chat/clear-session`')
        content = content.replace('http://localhost:8000${data.audio_url}', '${API_BASE_URL}${data.audio_url}')
        content = content.replace('http://localhost:8000${msg.audioUrl}', '${API_BASE_URL}${msg.audioUrl}')
        content = content.replace('http://localhost:8000${img.url}', '${API_BASE_URL}${img.url}')
    else:
        if 'http://localhost:8000' in content:
            content = f'import {{ API_BASE_URL }} from "{rel_path}";\n' + content
            # Replace 'http://localhost:8000/path' with `${API_BASE_URL}/path`
            content = re.sub(r"'http://localhost:8000(/?.*?)'", r'`${API_BASE_URL}\1`', content)
            content = re.sub(r'"http://localhost:8000(/?.*?)"', r'`${API_BASE_URL}\1`', content)
            content = content.replace('http://localhost:8000', '${API_BASE_URL}')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

files = [
    'frontend/src/utils/pushSubscription.ts',
    'frontend/src/sw.ts',
    'frontend/src/store/medicineStore.ts',
    'frontend/src/components/ChatbotAI.tsx',
    'frontend/src/components/CameraScanner.tsx'
]

for file in files:
    replace_in_file(file)

print('Success')
