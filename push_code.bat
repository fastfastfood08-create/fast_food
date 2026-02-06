@echo on
git add .
git commit -m "Upload project files"
git branch -M main
git push -u origin main
pause
