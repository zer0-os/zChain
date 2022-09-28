#!/bin/bash

# $1 == file name of .pem/.cer file (key)
# $2 == instance public ip

chmod 400 ./keys/$1
ssh -t -i ./keys/$1 ubuntu@$2 -o StrictHostKeyChecking=no 'cd zChain/; git pull;git checkout custom-script-terraform; cd simulator/nodes/;sudo sh ./scripts/1-start-node.sh;command;/bin/bash'
