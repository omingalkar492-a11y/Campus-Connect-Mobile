
# Apply purple glass theme tokens to all internal screens

$replacements = @{
  '#0E1713' = '#0D0018'
  '#0F1A14' = '#0D0018'
  '#14231B' = 'rgba(255,255,255,0.06)'
  '#15251E' = 'rgba(196,170,255,0.06)'
  '#162820' = 'rgba(196,170,255,0.08)'
  '#1A3327' = 'rgba(196,170,255,0.1)'
  '#13221A' = 'rgba(255,255,255,0.05)'
  '#1C3328' = 'rgba(196,170,255,0.1)'
  '#1E382B' = 'rgba(196,170,255,0.1)'
  '#192C23' = 'rgba(196,170,255,0.07)'
  '#13211B' = 'rgba(196,170,255,0.08)'
  '#15241C' = 'rgba(255,255,255,0.05)'
  '#1B3528' = 'rgba(196,170,255,0.1)'
  '#172E23' = 'rgba(196,170,255,0.12)'
  '#1B3327' = 'rgba(196,170,255,0.1)'
  '#1F3529' = 'rgba(196,170,255,0.1)'
  'rgba(142, 228, 175, 0.15)' = 'rgba(196,170,255,0.15)'
  'rgba(142, 228, 175, 0.12)' = 'rgba(196,170,255,0.12)'
  'rgba(142, 228, 175, 0.2)'  = 'rgba(196,170,255,0.2)'
  'rgba(142, 228, 175, 0.1)'  = 'rgba(196,170,255,0.1)'
  'rgba(142, 228, 175, 0.25)' = 'rgba(196,170,255,0.25)'
  'rgba(142, 228, 175, 0.3)'  = 'rgba(196,170,255,0.3)'
  'rgba(142, 228, 175, 0.05)' = 'rgba(196,170,255,0.05)'
  'rgba(142, 228, 175, 0.08)' = 'rgba(196,170,255,0.08)'
  'rgba(142, 228, 175, 0.35)' = 'rgba(196,170,255,0.35)'
  '#8EE4AF'                   = '#C4AAFF'
  '#A3D9BE'                   = '#C4AAFF'
  '#0B110E'                   = '#FFFFFF'
  "'#0E1713'"                 = "'#0D0018'"
}

$files = @(
  'src\app\admin.tsx',
  'src\app\super-admin.tsx',
  'src\app\(student)\profile.tsx',
  'src\app\(student)\campus.tsx'
)

foreach ($file in $files) {
  if (Test-Path $file) {
    $content = Get-Content $file -Raw -Encoding UTF8
    
    # Replace background references
    $content = $content -replace "backgroundColor: CampusTheme\.colors\.background", "backgroundColor: '#0A0010'"
    $content = $content -replace "\{ backgroundColor: colors\.background \}", "{ backgroundColor: '#0A0010' }"
    
    # Replace primary color references in key places (keep CampusTheme.colors.primary for text/borders)
    # Replace green-tinted backgrounds with purple
    foreach ($key in $replacements.Keys) {
      $escapedKey = [regex]::Escape($key)
      $content = $content -replace $escapedKey, $replacements[$key]
    }
    
    # Replace primary action button backgrounds
    $content = $content -replace "backgroundColor: CampusTheme\.colors\.primary,(\r?\n\s+borderRadius)", "backgroundColor: '#9B5CFF',`$1"
    $content = $content -replace "backgroundColor: CampusTheme\.colors\.primary\b", "backgroundColor: '#9B5CFF'"
    
    # Replace primary text color
    $content = $content -replace "color: CampusTheme\.colors\.primary\b", "color: '#C4AAFF'"
    
    # Replace border colors using primary
    $content = $content -replace "borderColor: CampusTheme\.colors\.primary\b", "borderColor: 'rgba(196,170,255,0.5)'"
    
    # Replace primary dim
    $content = $content -replace "backgroundColor: CampusTheme\.colors\.primaryDim\b", "backgroundColor: 'rgba(196,170,255,0.12)'"
    
    # Replace text colors
    $content = $content -replace "color: CampusTheme\.colors\.text\b", "color: '#FFFFFF'"
    $content = $content -replace "color: CampusTheme\.colors\.textMuted\b", "color: 'rgba(255,255,255,0.45)'"
    $content = $content -replace "color: CampusTheme\.colors\.textDim\b", "color: 'rgba(255,255,255,0.3)'"
    
    # Replace card backgrounds / borders
    $content = $content -replace "backgroundColor: CampusTheme\.colors\.card\b", "backgroundColor: 'rgba(255,255,255,0.06)'"
    $content = $content -replace "borderColor: CampusTheme\.colors\.cardBorder\b", "borderColor: 'rgba(196,170,255,0.15)'"
    
    # Tab/header backgrounds
    $content = $content -replace "backgroundColor: '#0E1713'", "backgroundColor: '#0D0018'"
    $content = $content -replace "backgroundColor: '#0F1A14'", "backgroundColor: '#0D0018'"
    
    # Fix "color dark on primary" - text on buttons
    $content = $content -replace "color: '#0E1713'", "color: '#FFFFFF'"
    $content = $content -replace "color: '#0D1411'", "color: '#FFFFFF'"
    $content = $content -replace "color: '#0B110E'", "color: '#FFFFFF'"
    
    Set-Content $file $content -Encoding UTF8 -NoNewline
    Write-Host "Updated: $file"
  } else {
    Write-Host "NOT FOUND: $file"
  }
}

Write-Host "Done!"
