
jsdoc -r assets/js/rns*.js assets/res/framework assets/js/readme.md -t node_modules/jsdoc-baseline -d assets/doc -c jsdoc/clientconfig.json

jsdoc -r api config jsdoc_readme.md -t node_modules/jsdoc-baseline -d assets/doc/api -c jsdoc/apiconfig.json

# Classic template
#jsdoc -r assets/js/rns*.js assets/res/framework assets/js/readme.md -d assets/doc -c jsdoc/clientconfig.json

#jsdoc -r api config jsdoc_readme.md -d assets/doc/api -c jsdoc/apiconfig.json