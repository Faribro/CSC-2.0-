with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Match d5_scheme block and replace with sws options
with open('scripts/update_sws.py', 'r', encoding='utf-8') as sf:
    s_code = sf.read()
import re
new_sws_match = re.search(r'new_sws = \'\'\'(.*?)\'\'\'', s_code, re.DOTALL)
if new_sws_match:
    new_sws_body = new_sws_match.group(1).strip()
    new_d5_scheme = new_sws_body.replace('"sws": [', '"d5_scheme": [')
    
    # replace d5_scheme in content
    old_d5_pattern = r'  "d5_scheme": \[.*?  \],'
    content = re.sub(old_d5_pattern, new_d5_scheme, content, flags=re.DOTALL)
    with open('frontend/lib/crfDefinitions.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("d5_scheme updated!")
