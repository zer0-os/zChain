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

# us-east-2 region
resource "aws_instance" "web" {
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
    Name = "web-${count.index}"
  }

  connection {
    type     = "ssh"
    user     = "ubuntu"
    host     = self.public_ip
    private_key = file("./keys/zchain-us-east-2.pem")
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

output "ip" {
  value = aws_instance.web.*.public_ip
}