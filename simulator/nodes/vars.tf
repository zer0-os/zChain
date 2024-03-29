variable "ec2_ami" {
  type = map

  default = {
    us-east-2 = "ami-02f3416038bdb17fb"
    us-east-1 = "ami-052efd3df9dad4825"
    us-west-1 = "ami-085284d24fe829cd0"
    us-west-2 = "ami-0d70546e43a941d70"
    af-south-1 = "ami-080bc3824e96f9b8d"
    ap-east-1 = "ami-0ecb6d8435affe2b6"
    ap-southeast-3 = "ami-043f1fdec42408287"
    ap-south-1 = "ami-068257025f72f470d"
    ap-northeast-3 = "ami-096d800410995ae84"
    ap-northeast-2 = "ami-058165de3b7202099"
    ap-southeast-1 = "ami-07651f0c4c315a529"
    ap-southeast-2 = "ami-09a5c873bc79530d9"
    ap-northeast-1 = "ami-07200fa04af91f087"
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

variable "t3_micro_instance_type" {
  type = string
  default = "t3.micro"
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
    af-south-1 = "sg-0a9623991e4d051a3"
    ap-east-1 = "sg-07c161f99c6b9e52e"
    ap-southeast-3 = "sg-095c4a92cea835a2d"
    ap-south-1 = "sg-07651cd74635057e8"
    ap-northeast-3 = "sg-03f8d6fe1a14b9098"
    ap-northeast-2 = "sg-0ce2d643e70cfe46c"
    ap-southeast-1 = "sg-0c4b038d085bfc8cd"
    ap-southeast-2 = "sg-0ec327c77cc2d1bff"
    ap-northeast-1 = "sg-0e9c43e27639cdd52"
  }
}