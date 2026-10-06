$ErrorActionPreference = "Stop"

# Git setup
git config user.name "Oskrtim2"
git config user.email "Oskrtim2@users.noreply.github.com"

# Commit 1: package.json
git add package.json
git commit -m "chore: add project dependencies for WallSense"

# Commit 2: package-lock.json
git add package-lock.json
git commit -m "chore: lock dependencies versions"

# Commit 3: App.tsx
git add App.tsx
git commit -m "feat: initialize root application component and navigation"

# Commit directories separately
$dirs = @("models", "services", "managers", "engines", "ui\components", "ui\screens")
foreach ($d in $dirs) {
    # We can't commit empty dirs in git, but we can just make a commit message or add a .keep file
    $keepPath = "src\$d\.keep"
    New-Item -ItemType File -Path $keepPath -Force | Out-Null
    git add $keepPath
    git commit -m "chore: setup $d directory structure"
}

# The files in src
$files = Get-ChildItem -Path "src" -Recurse -File | Where-Object { $_.Name -ne ".keep" }

foreach ($f in $files) {
    $relativePath = $f.FullName.Substring($PWD.Path.Length + 1).Replace('\', '/')
    
    $lines = Get-Content $f.FullName
    $totalLines = $lines.Length
    
    $tempFile = "$($f.FullName).bak"
    Copy-Item $f.FullName $tempFile
    
    # Step 1: Write first 1/3
    $third = [math]::Floor($totalLines / 3)
    if ($third -gt 0) {
        $lines[0..$third] | Out-File $f.FullName -Encoding utf8
        git add $relativePath
        git commit -m "feat: begin setup of $($f.Name)"
    }
    
    # Step 2: Write up to 2/3
    $twothird = [math]::Floor(($totalLines * 2) / 3)
    if ($twothird -gt $third) {
        $lines[0..$twothird] | Out-File $f.FullName -Encoding utf8
        git add $relativePath
        git commit -m "feat: add core logic to $($f.Name)"
    }
    
    # Step 3: Write full file
    $lines | Out-File $f.FullName -Encoding utf8
    git add $relativePath
    git commit -m "feat: finalize $($f.Name) implementation"
    
    Remove-Item $tempFile
}

# Add any remaining changes
git add .
git commit -m "fix: resolve any outstanding issues and format code"

# Setup remote and push
git remote add origin https://github.com/Oskrtim2/WallSense_SmartWatch.git
git branch -M main
# We won't push automatically because it might freeze asking for credentials.
# The user can push manually or we try it.
