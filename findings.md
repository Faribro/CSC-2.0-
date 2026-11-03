# Research & Technical Findings

## Reference Project Analysis: `Childcare-Support-Phase-3(1)`
- Location: `D:\OneDrive - INDIA HIV AIDS ALLIANCE\Desktop\Software Development\Childcare-Support-Phase-3(1)`
- Key components to inspect:
  - Three-tab top level navigation (`Forms`, `Submitted Surveys`, `Evaluation`)
  - Illustration banner and status cards layout on home
  - Field user phone OTP flow and roster access gate
  - State evaluation access control modal (State Evaluation vs Leadership)
  - Color scheme transitions and tokens

## SMS Gateway Research: TextBee (Android Gateway)
- Candidate: TextBee (Android app + API gateway relaying SMS via an Android device SIM)
- Official Documentation and API endpoints to verify
- Terms, licensing, and rate limits
- Regulatory context: Indian Telecom / TRAI DLT regulations for A2P SMS vs personal SIM
- Hardware setup: Dedicated spare Android device, continuous power, battery optimization disabled, keepalive check
- Fallbacks: Mock provider for local development, stub for licensed carrier SMS API

## Comic Theme Design Tokens & Contrast Analysis
- Canvas: `#FFFBF5`
- Surface: `#FFFFFF`
- Ink (Text): `#3B2F3F` (12.2:1 against canvas)
- Muted text: `#6B5B6E` (6.1:1 against canvas)
- Primary action: `#C8472F` (Coral, white text 4.8:1, hover `#B93A24` 5.7:1)
- Secondary / links: `#7B3F8C` (Plum, white text 7.2:1)
- Sunshine accent: `#FFD166` (Ink text 8.8:1)
- Mint tint: `#BFEBDD` (Ink text 9.7:1, light only, NO dark green)
- Lavender tint: `#E4D8F7` (Ink text 9.3:1)
- Peach tint: `#FFE1CC` (Ink text 10.2:1)
- Pink tint: `#FFD6E0` (Ink text 9.6:1)
- Border: `#8A7A8D` (4.0:1 against white)
- Success: `#1F6B52` on `#E6F8F1` (5.8:1)
- Warning: `#7A4A00` on `#FFF3C4` (6.7:1)
- Error: `#A3213C` on `#FFF0F3` (6.7:1)
- Focus ring: `3px solid #7B3F8C, 2px offset`
- Banned colors: All shades of blue (`#0000FF`, `#1E40AF`, `#2563EB`, `#3B82F6`, `#60A5FA`, `#93C5FD`, `#BFDBFE`, `#DBEAFE`, `#EFF6FF`, `#0284C7`, `#0EA5E9`, etc.) and dark green (`#064E3B`, `#065F46`, `#047857`, `#059669`, `#10B981`, `#044434`, etc.).
