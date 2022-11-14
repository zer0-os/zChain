#!/bin/bash

# $1 == file name of .pem/.cer file (key)
# $2 == instance public ip

chmod 400 ./keys/$1
ssh -o IdentitiesOnly=yes -i ./keys/$1 ubuntu@$2 -o StrictHostKeyChecking=no 'bash -s' < ./scripts/1-start-node.sh
