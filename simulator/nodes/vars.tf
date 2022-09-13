variable "ec2_ami" {
  type = map

  default = {
    us-east-2 = "ami-02f3416038bdb17fb"
    us-east-1 = "ami-052efd3df9dad4825"
    us-west-1 = "ami-085284d24fe829cd0"
    us-west-2 = "ami-0d70546e43a941d70"
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

variable "ec2_count" {
  type = number
  default = "1"
}

variable "security_group_ids" {
  type = map

  default = {
    us-east-1 = "sg-f512f4a3"
    # -- not needed for us-east-2 -- 
    us-west-1 = "sg-f5428184"
    us-west-2 = "sg-4bdab70d"
  }
}