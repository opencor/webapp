- `icon.png` is a `1024x1024` pixel version of `../src/renderer/src/assets/logo.svg`.
- `icon.ico` is an ICO file containing multiple resolutions of `../src/main/assets/icon.png`, created using the following command:

  ```bash
  magick ../src/main/assets/icon.png -define icon:auto-resize=16,24,32,40,48,64,128,256 icon.ico
  ```
- `icon.icns` is an ICNS file containing multiple resolutions of `icon.png`, created using the following commands:

  ```bash
  OUT=TEMP-$$.iconset

  mkdir $OUT

  resize_and_save() {
    magick icon.png -filter Lanczos -resize $1x$1 +repage -strip $2
  }

  resize_and_save   16 $OUT/icon_16x16.png
  resize_and_save   32 $OUT/icon_16x16@2x.png
  resize_and_save   32 $OUT/icon_32x32.png
  resize_and_save   64 $OUT/icon_32x32@2x.png
  resize_and_save   64 $OUT/icon_64x64.png
  resize_and_save  128 $OUT/icon_64x64@2x.png
  resize_and_save  128 $OUT/icon_128x128.png
  resize_and_save  256 $OUT/icon_128x128@2x.png
  resize_and_save  256 $OUT/icon_256x256.png
  resize_and_save  512 $OUT/icon_256x256@2x.png
  resize_and_save  512 $OUT/icon_512x512.png
  resize_and_save 1024 $OUT/icon_512x512@2x.png
  resize_and_save 1024 $OUT/icon_1024x1024.png

  iconutil -c icns $OUT -o icon.icns

  rm -fr $OUT
  ```
