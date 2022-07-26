resource "aws_security_group" "webSG" {
  name        = "webSG"
  description = "Allow ssh  inbound traffic"

  # open all ports
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
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
  # Creates four identical aws ec2 instances
  count = 2

  # All four instances will have the same ami and instance_type
  ami = lookup(var.ec2_ami,var.region)
  instance_type = var.instance_type #
  key_name = "terraform-us-east-2-demo"
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
    private_key = file("./keys/terraform-us-east-2-demo.pem")
  }

  provisioner "remote-exec" {
    inline = [
      # "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash",
      # ". ~/.nvm/nvm.sh",
      # "nvm install --lts",
      # "npm install -g yarn",
      "git clone https://github.com/zer0-os/zChain.git",
      "cd zChain",
      #"sh install.sh",
    ]
  }
}

output "ip" {
  value = aws_instance.web.*.public_ip
}