rmdir /S/Q dist
erase /s reversed.zip
mkdir dist
call cleancss -o dist\style.css style.css
call html-minifier --collapse-whitespace --remove-optional-tags --remove-script-type-attributes --remove-style-link-type-attributes   index.html --output dist\index.html
call uglifyjs -mt -o dist\reversed.js reversed.js
call svgo -f a -o dist\a
"c:\Program Files\7-Zip\7z.exe" a -mx9 -r -tzip reversed.zip dist\*.*
dir reversed.zip