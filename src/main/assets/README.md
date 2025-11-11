- `icon.png` is a rounded square version `../src/renderer/src/assets/logo.svg`, created using the following commands:

  ```bash
  MASK=mask-$$.png

  magick -size 1024x1024 xc:none -draw "roundrectangle 0,0,1023,1023,192,192" $MASK
  magick ../../../build/icon.png -alpha set $MASK -compose DstIn -composite icon.png

  rm -f $MASK
  ```
