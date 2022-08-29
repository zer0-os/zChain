variable "ec2_ami" {
  type = map

  default = {
    us-east-2 = "ami-02f3416038bdb17fb"
    #us-east-1 = "ami-052efd3df9dad4825"
    #us-west-1 = "ami-085284d24fe829cd0"
  }
}

# Creating a Variable for region

variable "region" {
  default = "us-east-2"
}


# Creating a Variable for instance_type
variable "instance_type" {
  type = string

  default = "t2.micro"
}
