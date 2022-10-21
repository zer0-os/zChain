# note: this file is simply a (very) brute force with using terraform. It was created just to quickly deploy
# multiple zchain nodes in multiple ec2 in multiple regions for testing 


# resource "aws_security_group" "webSG" {
#   name        = "webSG"
#   description = "Allow ssh  inbound traffic"
#   vpc_id      = "vpc-33935758"

#   # open all ports
#   ingress {
#     cidr_blocks      = [ "0.0.0.0/0" ]
#     description      = ""
#     from_port        = 22
#     ipv6_cidr_blocks = []
#     prefix_list_ids  = []
#     protocol         = "tcp"
#     security_groups  = []
#     self             = false
#     to_port          = 22
#   }

#   egress {
#     from_port       = 0
#     to_port         = 0
#     protocol        = "-1"
#     cidr_blocks     = ["0.0.0.0/0"]
#   }
# }

# # us-east-1 region
# resource "aws_instance" "web-us-east-1" {
#   provider = aws.us-east-1

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "us-east-1")
#   instance_type          = var.instance_type
#   key_name               = "zchain-us-east-1"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "us-east-1") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-us-east-1-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-us-east-1.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/us-east-1.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }

# Specify 3 availability zones from the region
variable "availability_zones" {
  default = ["us-east-2a", "us-east-2b", "us-east-2c"]
}

# variable "availability_zones" {
#   default = ["us-east-2a"]
# }

# Create a VPC
resource "aws_vpc" "my_vpc" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true

  tags = {
    Name = "my_vpc"
  }
}

resource "aws_security_group" "ssh_allowed" {
    vpc_id = "${aws_vpc.my_vpc.id}"
    
    # open all ports
    ingress {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }

    egress {
      from_port       = 0
      to_port         = 0
      protocol        = "-1"
      cidr_blocks     = ["0.0.0.0/0"]
    }

    tags = {
        Name = "ssh-allowed"
    }
}


# Create a subnet in each availability zone in the VPC. Keep in mind that at this point these subnets are private without internet access. They would need other networking resources for making them accesible
resource "aws_subnet" "my_subnet" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.my_vpc.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = var.availability_zones[count.index]
  map_public_ip_on_launch = "true" //it makes this a public subnet

  tags = {
    Name = "my-subnet-${count.index}"
  }
}

# us-east-2 region
resource "aws_instance" "web-us-east-2" {

  # Creates "n" identical aws ec2 instances
  count         = length(var.availability_zones)

  # All four instances will have the same ami and instance_type
  ami = lookup(var.ec2_ami,var.region)
  instance_type = var.instance_type #
  #associate_public_ip_address = "true"
  key_name = "zchain-us-east-2"
  subnet_id = aws_subnet.my_subnet[count.index].id

  # Security Group
  vpc_security_group_ids = ["${aws_security_group.ssh_allowed.id}"]
 

  tags = {
    # The count.index allows you to launch a resource
    # starting with the distinct index number 0 and corresponding to this instance.
    Name = "web-us-east-2-${count.index}"
  }

  connection {
    type     = "ssh"
    user     = "ubuntu"
    host     = "${self.public_ip}"
    private_key = file("./keys/zchain-us-east-2.cer")
  }

  provisioner "remote-exec" {
    inline = [
      "git clone https://github.com/zer0-os/zChain.git",
      "cd zChain",
    ]
  }

  # provisioner "local-exec" {
  #   command = "echo ${self.public_ip} >> ./public_ips/us-east-2.txt"
  # }

  # provisioner "local-exec" {
  #   when    = destroy
  #   command = "rm -rf ./public_ips/*"
  # }
}

resource "aws_eip" "web-us-east-2-eip" {
  count         = length(var.availability_zones)

  instance = "${aws_instance.web-us-east-2[count.index].id}"
  vpc      = true

  provisioner "local-exec" {
    command = "echo ${self.public_ip} >> ./public_ips/us-east-2.txt"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "rm -rf ./public_ips/*"
  }
}

resource "aws_internet_gateway" "test-env-gw" {
  vpc_id = "${aws_vpc.my_vpc.id}"

  tags = {
    Name = "test-env-gw"
  }
}

resource "aws_route_table" "route-table-test-env" {
  vpc_id = "${aws_vpc.my_vpc.id}"
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.test-env-gw.id}"
  }
  tags = {
    Name = "test-env-route-table"
  }
}

resource "aws_route_table_association" "subnet-association" {
  count         = length(var.availability_zones)

  subnet_id      = "${aws_subnet.my_subnet[count.index].id}"
  route_table_id = "${aws_route_table.route-table-test-env.id}"
}

# # us-east-2 region
# resource "aws_instance" "web-us-east-2" {
#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami = lookup(var.ec2_ami,var.region)
#   instance_type = var.instance_type #
#   key_name = "zchain-us-east-2"
#   vpc_security_group_ids = ["${aws_security_group.webSG.id}"]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-us-east-2-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-us-east-2.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/us-east-2.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }


# # us-west-1 region
# resource "aws_instance" "web-us-west-1" {
#   provider = aws.us-west-1

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "us-west-1")
#   instance_type          = var.instance_type
#   key_name               = "zchain-us-west-1"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "us-west-1") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-us-west-1-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-us-west-1.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/us-west-1.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }

# # us-west-2
# resource "aws_instance" "web-us-west-2" {
#   provider = aws.us-west-2

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "us-west-2")
#   instance_type          = var.instance_type
#   key_name               = "zchain-us-west-2"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "us-west-2") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-us-west-2-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-us-west-2.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/us-west-2.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }


# # us-af-south-1
# resource "aws_instance" "web-af-south-1" {
#   provider = aws.af-south-1

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "af-south-1")
#   instance_type          = var.t3_micro_instance_type
#   key_name               = "zchain-af-south-1"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "af-south-1") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-af-south-1-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-af-south-1.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/af-south-1.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }

# # us-ap-east-1
# resource "aws_instance" "web-ap-east-1" {
#   provider = aws.ap-east-1

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "ap-east-1")
#   instance_type          = var.t3_micro_instance_type
#   key_name               = "zchain-ap-east-1"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "ap-east-1") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-ap-east-1-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-ap-east-1.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/ap-east-1.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }

# # us-ap-southeast-3
# resource "aws_instance" "web-ap-southeast-3" {
#   provider = aws.ap-southeast-3

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "ap-southeast-3")
#   instance_type          = var.t3_micro_instance_type
#   key_name               = "zchain-ap-southeast-3"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "ap-southeast-3") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-ap-southeast-3-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-ap-southeast-3.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/ap-southeast-3.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }

# # us-ap-south-1
# resource "aws_instance" "web-ap-south-1" {
#   provider = aws.ap-south-1

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "ap-south-1")
#   instance_type          = var.instance_type
#   key_name               = "zchain-ap-south-1"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "ap-south-1") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-ap-south-1-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-ap-south-1.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/ap-south-1.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }


# # us-ap-northeast-3
# resource "aws_instance" "web-ap-northeast-3" {
#   provider = aws.ap-northeast-3

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "ap-northeast-3")
#   instance_type          = var.instance_type
#   key_name               = "zchain-ap-northeast-3"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "ap-northeast-3") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-ap-northeast-3-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-ap-northeast-3.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/ap-northeast-3.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }

# # us-ap-northeast-2
# resource "aws_instance" "web-ap-northeast-2" {
#   provider = aws.ap-northeast-2

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "ap-northeast-2")
#   instance_type          = var.instance_type
#   key_name               = "zchain-ap-northeast-2"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "ap-northeast-2") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-ap-northeast-2-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-ap-northeast-2.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/ap-northeast-2.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }

# # us-ap-northeast-1
# resource "aws_instance" "web-ap-northeast-1" {
#   provider = aws.ap-northeast-1

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "ap-northeast-1")
#   instance_type          = var.instance_type
#   key_name               = "zchain-ap-northeast-1"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "ap-northeast-1") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-ap-northeast-1-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-ap-northeast-1.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/ap-northeast-1.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }

# # us-ap-southeast-1
# resource "aws_instance" "web-ap-southeast-1" {
#   provider = aws.ap-southeast-1

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "ap-southeast-1")
#   instance_type          = var.instance_type
#   key_name               = "zchain-ap-southeast-1"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "ap-southeast-1") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-ap-southeast-1-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-ap-southeast-1.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/ap-southeast-1.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }

# # us-ap-southeast-2
# resource "aws_instance" "web-ap-southeast-2" {
#   provider = aws.ap-southeast-2

#   # Creates "n" identical aws ec2 instances
#   count = var.ec2_count

#   # All four instances will have the same ami and instance_type
#   ami                    = lookup(var.ec2_ami, "ap-southeast-2")
#   instance_type          = var.instance_type
#   key_name               = "zchain-ap-southeast-2"
#   vpc_security_group_ids = [ lookup(var.security_group_ids, "ap-southeast-2") ]

#   tags = {
#     # The count.index allows you to launch a resource
#     # starting with the distinct index number 0 and corresponding to this instance.
#     Name = "web-ap-southeast-2-${count.index}"
#   }

#   connection {
#     type     = "ssh"
#     user     = "ubuntu"
#     host     = self.public_ip
#     private_key = file("./keys/zchain-ap-southeast-2.cer")
#   }

#   provisioner "remote-exec" {
#     inline = [
#       "git clone https://github.com/zer0-os/zChain.git",
#       "cd zChain",
#     ]
#   }

#   provisioner "local-exec" {
#     command = "echo ${self.public_ip} >> ./public_ips/ap-southeast-2.txt"
#   }

#   provisioner "local-exec" {
#     when    = destroy
#     command = "rm -rf ./public_ips/*"
#   }
# }


output "us-east-2-ip" {
  value = aws_instance.web-us-east-2.*.public_ip
}

# output "us-east-1-ip" {
#   value = aws_instance.web-us-east-1.*.public_ip
# }

# output "us-west-1-ip" {
#   value = aws_instance.web-us-west-1.*.public_ip
# }

# output "us-west-2-ip" {
#   value = aws_instance.web-us-west-2.*.public_ip
# }

# output "af-south-1-ip" {
#   value = aws_instance.web-af-south-1.*.public_ip
# }

# output "ap-east-1-ip" {
#   value = aws_instance.web-ap-east-1.*.public_ip
# }

# output "ap-southeast-3-ip" {
#   value = aws_instance.web-ap-southeast-3.*.public_ip
# }

# output "ap-south-1-ip" {
#   value = aws_instance.web-ap-south-1.*.public_ip
# }

# output "ap-northeast-3-ip" {
#   value = aws_instance.web-ap-northeast-3.*.public_ip
# }

# output "ap-northeast-2-ip" {
#   value = aws_instance.web-ap-northeast-2.*.public_ip
# }

# output "ap-southeast-1-ip" {
#   value = aws_instance.web-ap-southeast-1.*.public_ip
# }

# output "ap-southeast-2-ip" {
#   value = aws_instance.web-ap-southeast-2.*.public_ip
# }

# output "ap-northeast-1-ip" {
#   value = aws_instance.web-ap-northeast-1.*.public_ip
# }
