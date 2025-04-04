rm -rf temp_package/ linkedin-post-automator-fixed.zip
mkdir -p temp_package
cd temp_package
cp -r ../* .
rm -rf temp_package/
zip -r ../linkedin-post-automator-fixed.zip *
cd ..
rm -rf temp_package/
