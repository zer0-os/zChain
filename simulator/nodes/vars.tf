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

    ca-central-1 = "ami-0a7154091c5c6623e"
    eu-central-1 = "ami-0caef02b518350c8b"
    eu-west-1 = "ami-096800910c1b781ba"
    eu-west-2 = "ami-0f540e9f488cfa27d"
    eu-south-1 = "ami-0579ab55007adb044"
    eu-west-3 = "ami-0493936afbe820b28"
    eu-north-1 = "ami-0efda064d1b5e46a5"
    me-south-1 = "ami-03de2671163dff759"
    me-central-1 = "ami-0641db4da1d840326"
    sa-east-1 = "ami-04b3c23ec8efcc2d6"
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

    ca-central-1 = "sg-0f672968d2f5fde43"
    eu-central-1 = "sg-08f6a61d0ff1bb856"
    eu-west-1 = "sg-0db4351d248cb70f1"
    eu-west-2 = "sg-005699012e25135d1"
    eu-south-1 = "sg-0dfa033b96bf2a7b4"
    eu-west-3 = "sg-09a2a1bd90bf949ca"
    eu-north-1 = "sg-07836dee9ff746fb3"
    me-south-1 = "sg-075005151ec14da26"
    me-central-1 = "sg-01cc6b14028cd1fc0"
    sa-east-1 = "sg-0b91d7aa9f4afda99"
  }
}