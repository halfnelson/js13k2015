rmdir /S/Q dist
erase /s reversed.zip
mkdir dist
call cleancss -o dist\style.css style.css

 call html-minifier --collapse-whitespace --remove-optional-tags --remove-script-type-attributes --remove-style-link-type-attributes   index.html --output dist\index.html
call uglifyjs -mt -b beautify=false,ascii-only=true  -o dist\reversed.js musicplayer.js music.js reversed.js
call svgo -f a --disable=convertColors -p 2  -o dist\a
"c:\Program Files\7-Zip\7z.exe" a -mx9 -r -tzip reversed.zip dist\*.*
dir reversed.zip