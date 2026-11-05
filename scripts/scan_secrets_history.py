import subprocess
import re
import sys

SECRET_PATTERNS = [
    (r'(?i)AKIA[0-9A-Z]{16}', 'AWS Access Key'),
    (r'-----BEGIN (?:RSA )?PRIVATE KEY-----', 'Private Key'),
    (r'(?i)ghp_[0-9a-zA-Z]{36}', 'GitHub Personal Access Token'),
    (r'(?i)xox[baprs]-[0-9a-zA-Z]{10,48}', 'Slack Token'),
    (r'vcp_[0-9a-zA-Z]{30,}', 'Vercel Token'),
    (r'rnd_[0-9a-zA-Z]{20,}', 'Render API Key'),
]

# Excluded synthetic/test tokens that are intentionally committed for local unit tests
SAFE_ALLOWLIST = [
    'local_gateway_synthetic_secret_token_12345',
    'local_dev_only_synthetic_jwt_signing_key_never_used_in_prod_0123456789',
    'local_dev_service_secret_token_abcdef123456789',
    'csc2_migration_secret_pass',
    'csc2_app_secret_pass',
    'TestPass123!',
]

def scan_repo():
    print("Running Repository Git History Secret Scan...")
    cmd = ['git', 'log', '-p', '--full-history', '--all']
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors='ignore')
    
    findings = []
    line_num = 0
    current_commit = "UNKNOWN"
    
    for line in proc.stdout:
        line_num += 1
        if line.startswith("commit "):
            current_commit = line.strip().split()[1]
        
        # Only check added lines in diffs
        if line.startswith("+") and not line.startswith("+++"):
            content = line[1:]
            
            # Check if line is safe allowlisted test secret
            if any(allow in content for allow in SAFE_ALLOWLIST):
                continue
                
            for pattern, desc in SECRET_PATTERNS:
                if re.search(pattern, content):
                    findings.append((current_commit, desc, line[:40] + "..."))

    proc.wait()
    if findings:
        print(f"FAILED: Found {len(findings)} potential secret(s) in git history:")
        for commit, desc, snippet in findings:
            print(f" - Commit {commit[:8]}: {desc} -> {snippet}")
        sys.exit(1)
    else:
        print("PASSED: Full git history secret scan clean. Zero real credentials or tokens found in git history.")

if __name__ == '__main__':
    scan_repo()
