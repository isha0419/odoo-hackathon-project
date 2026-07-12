import re

with open('backend/tests/test_booking.py', 'r') as f:
    content = f.read()

content = re.sub(r'"start_time"', r'"start"', content)
content = re.sub(r'"end_time"', r'"end"', content)
content = re.sub(r'\n\s+"purpose": "[^"]+",', '', content)

with open('backend/tests/test_booking.py', 'w') as f:
    f.write(content)
