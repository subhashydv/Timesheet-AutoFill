#! /bin/bash

VMS_CRON="*/20 9-18 * * 1-5"
PWD=`PWD`

if ! command -v node &> /dev/null; then
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
   nvm install 20
fi


NodePath=`which node`

echo 
read -p "Please Enter Your TP ID : " TP_ID
read -p "Please Enter TP id password : " PASSWORD

npm install
echo "VMS_URL=https://vms.com:8443/" > .env
echo "# Add your vms username and password" >> .env
echo "VMS_USERNAME=$TP_ID" >> .env
echo "VMS_PASSWORD=$PASSWORD" >> .env
echo "# NOTE: update project code and task" >> .env
echo "PROJECT=integration" >> .env
echo "TASK=Development" >> .env
echo "COMMENT=work from home" >> .env

echo | crontab -
(crontab -l ; echo "PATH=$NodePath:$PATH") | crontab -
(crontab -l ; echo "$VMS_CRON node $PWD/lib/vms.js > $PWD/logfile 2>&1") | crontab -
