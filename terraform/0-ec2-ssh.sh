ssh -t -i ~/terraform-us-east-2-demo.pem ubuntu@3.23.87.165 -o StrictHostKeyChecking=no 'cd zChain/terraform;sudo sh 1-start-node.sh;command;/bin/bash'

# cd zChain
# cat install.sh