# note: this file is simply a (very) brute force with using terraform. It was created just to quickly deploy
# multiple zchain nodes in multiple ec2 in multiple regions for testing 

resource "aws_security_group" "webSG" {
  name        = "webSG"
  description = "Allow ssh  inbound traffic"
  
  # open all ports
  ingress {
    cidr_blocks      = [ "0.0.0.0/0", ]
    description      = ""
    from_port        = 22
    ipv6_cidr_blocks = []
    prefix_list_ids  = []
    protocol         = "tcp"
    security_groups  = []
    self             = false
    to_port          = 22
  }

  egress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    cidr_blocks     = ["0.0.0.0/0"]
  }
}

# us-east-1 region
resource "aws_instance" "web-us-east-1" {
  provider = aws.us-east-1

  # Creates five identical aws ec2 instances
  count = 5

  # All four instances will have the same ami and instance_type
  ami = "ami-052efd3df9dad4825"
  instance_type = var.instance_type #
  key_name = "zchain-us-east-1"
  vpc_security_group_ids = ["sg-f512f4a3"]

  tags = {
    # The count.index allows you to launch a resource
    # starting with the distinct index number 0 and corresponding to this instance.
    Name = "web-us-east-1-${count.index}"
  }

  connection {
    type     = "ssh"
    user     = "ubuntu"
    host     = self.public_ip
    private_key = file("./keys/zchain-us-east-1.cer")
  }

  provisioner "remote-exec" {
    inline = [
      "git clone https://github.com/zer0-os/zChain.git",
      "cd zChain",
    ]
  }

  provisioner "local-exec" {
    command = "echo ${self.public_ip} >> ./public_ips/us-east-1.txt"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "rm -rf ./public_ips/*"
  }
}


# us-east-2 region
resource "aws_instance" "web-us-east-2" {
  # Creates five identical aws ec2 instances
  count = 5

  # All four instances will have the same ami and instance_type
  ami = lookup(var.ec2_ami,var.region)
  instance_type = var.instance_type #
  key_name = "zchain-us-east-2"
  vpc_security_group_ids = ["${aws_security_group.webSG.id}"]

  tags = {
    # The count.index allows you to launch a resource
    # starting with the distinct index number 0 and corresponding to this instance.
    Name = "web-us-east-2-${count.index}"
  }

  connection {
    type     = "ssh"
    user     = "ubuntu"
    host     = self.public_ip
    private_key = file("./keys/zchain-us-east-2.cer")
  }

  provisioner "remote-exec" {
    inline = [
      "git clone https://github.com/zer0-os/zChain.git",
      "cd zChain",
    ]
  }

  provisioner "local-exec" {
    command = "echo ${self.public_ip} >> ./public_ips/us-east-2.txt"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "rm -rf ./public_ips/*"
  }
}


# # us-west-1 region (NOT WORKING)
# resource "aws_instance" "web-us-west-1" {
#   # Creates five identical aws ec2 instances
#   count = 5

#   # All four instances will have the same ami and instance_type
#   ami                    = "ami-085284d24fe829cd0"
#   instance_type          = var.instance_type #
#   key_name               = "zchain-us-west-1"
#   vpc_security_group_ids = ["sg-f5428184"]

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

# us-west-2
# resource "aws_instance" "web-us-west-2" {
#   # Creates five identical aws ec2 instances
#   count = 5

#   # All four instances will have the same ami and instance_type
#   ami                    = "ami-0c2ab3b8efb09f272"
#   instance_type          = var.instance_type #
#   key_name               = "zchain-us-west-2"
#   vpc_security_group_ids = ["sg-4bdab70d"]

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

output "us-east-2-ip" {
  value = aws_instance.web-us-east-2.*.public_ip
}

output "us-east-1-ip" {
  value = aws_instance.web-us-east-1.*.public_ip
}

# (NOT WORKING for us-west-1, giving invalid AMI)
# output "us-west-1-ip" {
#   value = aws_instance.web-us-west-1.*.public_ip
# }

# output "us-west-2-ip" {
#   value = aws_instance.web-us-west-2.*.public_ip
# }