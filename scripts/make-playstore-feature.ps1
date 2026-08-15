Add-Type -AssemblyName System.Drawing

$Out = 'release\playstore-feature-graphic-premium-v4-1024x500.jpg'
$IconPath = Resolve-Path 'assets\icon.png'

function K([int[]]$codes) {
  -join ($codes | ForEach-Object { [char]$_ })
}
function C($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function B($hex) { New-Object System.Drawing.SolidBrush (C $hex) }
function ABrush($a, $hex) {
  $base = C $hex
  New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($a, $base.R, $base.G, $base.B))
}
function APen($a, $hex, $w) {
  $base = C $hex
  New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb($a, $base.R, $base.G, $base.B)), $w
}
function RR($x,$y,$w,$h,$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x,$y,$d,$d,180,90)
  $path.AddArc($x+$w-$d,$y,$d,$d,270,90)
  $path.AddArc($x+$w-$d,$y+$h-$d,$d,$d,0,90)
  $path.AddArc($x,$y+$h-$d,$d,$d,90,90)
  $path.CloseFigure()
  $path
}
function DrawCard($g,$x,$y,$w,$h,$r,$fill,$stroke) {
  $path = RR $x $y $w $h $r
  $g.FillPath($fill,$path)
  if ($null -ne $stroke) { $g.DrawPath($stroke,$path) }
}
function DrawText($g,$text,$font,$brush,$x,$y) {
  $g.DrawString($text,$font,$brush,[single]$x,[single]$y)
}
function DrawPhone($g,$x,$y,$w,$h,$kind) {
  DrawCard $g ($x+18) ($y+22) $w $h 38 (ABrush 46 '#000000') $null
  DrawCard $g $x $y $w $h 38 (B '#f8fafc') (APen 165 '#cbd5e1' 2)
  DrawCard $g ($x+14) ($y+13) ($w-28) 28 14 (B '#ffffff') $null
  DrawText $g 'BasiCS' $script:FontPhoneTitle (B '#0f172a') ($x+25) ($y+55)

  if ($kind -eq 'learn') {
    DrawText $g (K @(54617,49845,51008,32,54617,49845,45824,47196)) $script:FontPhoneTiny (B '#64748b') ($x+25) ($y+83)
    DrawCard $g ($x+23) ($y+113) ($w-46) 96 18 (B '#0f172a') $null
    DrawText $g (K @(50724,45720,51032,32,47336,54004)) $script:FontPhoneTiny (B '#93c5fd') ($x+39) ($y+130)
    DrawText $g (K @(54617,49845,32,48,44060,32,47,32,47928,51228,32,48,44060)) $script:FontPhoneBold (B '#ffffff') ($x+39) ($y+160)
    DrawCard $g ($x+23) ($y+228) ($w-46) 84 18 (B '#ffffff') (APen 150 '#e2e8f0' 1)
    DrawCard $g ($x+40) ($y+247) 60 25 12 (B '#dbeafe') $null
    DrawText $g (K @(54617,49845)) $script:FontPhoneTiny (B '#2563eb') ($x+55) ($y+251)
    DrawText $g (K @(44060,45392,51012,32,52264,44540,52264,44540,32,51069,44592)) $script:FontPhoneBold (B '#0f172a') ($x+40) ($y+278)
    DrawCard $g ($x+23) ($y+328) ($w-46) 84 18 (B '#ffffff') (APen 150 '#e2e8f0' 1)
    DrawCard $g ($x+40) ($y+347) 60 25 12 (B '#ffedd5') $null
    DrawText $g (K @(47928,51228)) $script:FontPhoneTiny (B '#ea580c') ($x+55) ($y+351)
    DrawText $g (K @(47928,51228,47564,32,44264,46972,49436,32,54400,44592)) $script:FontPhoneBold (B '#0f172a') ($x+40) ($y+378)
  } else {
    DrawText $g (K @(51452,51228,48324,32,51652,46020)) $script:FontPhoneBold (B '#0f172a') ($x+25) ($y+112)
    $labels = @(
      (K @(50868,50689,52404,51228)),
      (K @(45348,53944,50892,53356)),
      (K @(45936,51060,53552,48288,51060,49828)),
      (K @(51088,47308,44396,51312))
    )
    $colors = @('#2563eb','#14b8a6','#f97316','#8b5cf6')
    for($i=0; $i -lt 4; $i++) {
      $yy = $y + 154 + ($i*55)
      DrawText $g $labels[$i] $script:FontPhoneTiny (B '#334155') ($x+29) $yy
      DrawCard $g ($x+29) ($yy+24) ($w-58) 9 5 (B '#e2e8f0') $null
      DrawCard $g ($x+29) ($yy+24) (72 + $i*23) 9 5 (B $colors[$i]) $null
    }
    DrawCard $g ($x+23) ($y+388) ($w-46) 52 17 (B '#ecfeff') (APen 150 '#a5f3fc' 1)
    DrawText $g (K @(48513,47560,53356,50752,32,53685,44228,47196,32,48373,49845)) $script:FontPhoneBold (B '#0e7490') ($x+39) ($y+405)
  }
}

$bmp = [System.Drawing.Bitmap]::new(1024,500,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$rect = [System.Drawing.Rectangle]::new(0,0,1024,500)
$grad = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, (C '#0b1020'), (C '#172554'), 18)
$g.FillRectangle($grad,$rect)
$g.FillEllipse((ABrush 112 '#2563eb'), 660, -128, 420, 420)
$g.FillEllipse((ABrush 72 '#14b8a6'), 386, 336, 330, 220)
$g.FillEllipse((ABrush 68 '#f97316'), -120, 325, 260, 260)
for($i=0; $i -lt 18; $i++) {
  $x = 48 + ($i*58)
  $g.DrawLine((APen 20 '#ffffff' 1),$x,0,$x,500)
}

$script:FontBrand = [System.Drawing.Font]::new('Segoe UI', 72, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$script:FontHead = [System.Drawing.Font]::new('Malgun Gothic', 42, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$script:FontSub = [System.Drawing.Font]::new('Malgun Gothic', 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$script:FontTag = [System.Drawing.Font]::new('Malgun Gothic', 19, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$script:FontPhoneTitle = [System.Drawing.Font]::new('Segoe UI', 18, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$script:FontPhoneTiny = [System.Drawing.Font]::new('Malgun Gothic', 12, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$script:FontPhoneBold = [System.Drawing.Font]::new('Malgun Gothic', 16, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

$icon = [System.Drawing.Image]::FromFile($IconPath)
DrawCard $g 64 58 64 64 18 (B '#f8fafc') $null
$g.DrawImage($icon,72,66,48,48)
DrawText $g 'BasiCS' $script:FontBrand (B '#ffffff') 64 130
DrawText $g (K @(67,83,32,47732,51217,32,51456,48708,47484)) $script:FontHead (B '#ffffff') 68 236
DrawText $g (K @(44060,45392,48512,53552,32,47928,51228,44620,51648)) $script:FontHead (B '#93c5fd') 68 287
DrawText $g (K @(50868,50689,52404,51228,44,32,45348,53944,50892,53356,44,32,45936,51060,53552,48288,51060,49828,47484,32,54620,32,55120,47492,51004,47196,32,51221,47532)) $script:FontSub (B '#cbd5e1') 72 358

$tagData = @(
  @((K @(54645,49900,32,44060,45392)),'#dbeafe','#2563eb',72,418,106),
  @((K @(47732,51217,32,47928,51228)),'#ffedd5','#ea580c',194,418,106),
  @((K @(54617,49845,32,44592,47197)),'#ccfbf1','#0f766e',316,418,106)
)
foreach($t in $tagData) {
  DrawCard $g $t[3] $t[4] $t[5] 42 21 (B $t[1]) $null
  DrawText $g $t[0] $script:FontTag (B $t[2]) ($t[3]+18) ($t[4]+8)
}

DrawPhone $g 574 44 208 438 'learn'
DrawPhone $g 778 82 174 374 'stats'

DrawCard $g 486 380 166 58 18 (B '#ffffff') $null
DrawText $g (K @(47928,51228,32,49,48,54,44060)) $script:FontTag (B '#ea580c') 516 391
DrawText $g (K @(51452,51228,48324,32,54400,51060)) $script:FontTag (B '#475569') 516 415

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = [System.Drawing.Imaging.EncoderParameters]::new(1)
$params.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, 96L)
$bmp.Save((Join-Path (Get-Location) $Out), $codec, $params)

$icon.Dispose()
$g.Dispose()
$bmp.Dispose()

$check = [System.Drawing.Image]::FromFile((Resolve-Path $Out))
[pscustomobject]@{
  FullName = (Resolve-Path $Out).Path
  Width = $check.Width
  Height = $check.Height
  PixelFormat = $check.PixelFormat
  Size = (Get-Item $Out).Length
}
$check.Dispose()
