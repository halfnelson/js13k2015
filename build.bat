rmdir /S/Q dist
erase /s reversed.zip
mkdir dist
call cleancss -o dist\style.css style.css

call html-minifier --collapse-whitespace --remove-optional-tags --remove-script-type-attributes --remove-style-link-type-attributes   index.html --output dist\index.html

call uglifyjs  --mangle-props  --reserve-domprops --screw-ie8  -c  -mt -b beautify=false,ascii-only=true  -o dist\reversed.js musicplayer.js music.js reversed.js

rem now embedded in the html to allow play from  local file system call svgo -f a --disable=convertColors -p 2  -o dist\a
copy *.svg dist

"c:\Program Files\7-Zip\7z.exe" a -mx9 -r -tzip reversed.zip dist\*.*
dir reversed.zip