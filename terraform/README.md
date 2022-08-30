# Simulator

zChain nodes simulator using [terraform](https://www.terraform.io/) (infrastructure as code). Programmatically spawning n nodes in cloud that automatically find one another and connect. You can use the simlator to automate deployment of zchain nodes (using terraform) on multiple aws ec2's. AWS Regions are currently limited to `us-east-1` & `us-east-2`. Please follow the set up instructions before running the simulator.

*Please **note** that this guide (and simulator) is more focused towards devs (tested on linux & macOS)*

## Set Up

### Terraform 

First you need to install terraform-cli. Please follow [this](https://learn.hashicorp.com/tutorials/terraform/install-cli?in=terraform/certification-associate-tutorials) link to install the cli. After the terraform cli is installed you can confirm the installation by running `terraform --help`.

### AWS

Since the nodes will be running on AWS ec2's, you need to link your AWS account, and add appropriate access keys for the each region (i.e `us-east-1` & `us-east-2`).

First, you need to add `aws_access_key_id` & `aws_secret_access_key` to your env:
+ Sign in to AWS console (dashboard)
+ Go to `IAM` -> `Manage Acess Keys`
+ From there you can generate a new acess key, or use an existing one. After you have you access key ID and secret, add them to your env variables:

```sh
export AWS_ACCESS_KEY_ID=<your-access-key-id>
export AWS_SECRET_ACCESS_KEY=<your-access-key-secret>
```

After adding your access key, you need to add a key-pair for each region you're deploying (launching) your *ec2's* in:
+ Sign in to AWS console (dashboard)
+ Go to `ec2` -> `Key Pairs`.
+ From there you can generate a new key pair, or use an existing key pair. 
+ Please **name your key pair** in this format `zchain-<region>`. For example, a key-pair generated in `us-east-1` region should be named as `zchain-us-east-1.pem`.
+ Download the key pair file and **save it in** `keys/` folder. You can do the same for each region you want to deploy to.


## Running

Before running, you can change some existing config in `main.tf` file:
+ In `connection { .., private_key: <key> }`, you can change the extension as `.pem/.cer` depending on your downloaded key pair.
+ You can also change the `count` variable in (`resource "aws_instance"`) to change the number of ec2 to deploy in each region.

After the credentials are all set up, you can run the simulator using:
```sh
// initializes terraform
terraform init

// deploy
terraform apply -auto-approve
```

With the current config, this will deploy 5 ec2's on `us-east-1` region & 5 ec2's on `us-east-2` regions. 

After deployment, you get the public ip addresses of all ec2's in `/public_ips` folder. You can ssh into the 
ec2 using that ip.

*NOTE*: If you're using `linux`, you can run the simulator visually, i.e run each node, on each ec2, on each terminal. Currently it's a *wip* for macOS, since running bash commands on a new terminal is a bit tricky there. 

![simulator](https://user-images.githubusercontent.com/33264364/187364748-8930abed-1d78-4533-b872-e7cbac6ae016.jpeg)