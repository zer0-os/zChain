# starts zchain node at an ec2 launched by terraform
# note: this scripts runs "inside" the ec2 (after ssh)

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install node
nvm use node
npm install -g yarn
cd ../../
sh install.sh
cd apps/meow
rm -rf ~/.zchain
yarn run dev:ratik
