cat << 'EOF' > README.md
# Pulumi EC2 Instance Provisioning (AWS)

This project provisions an **AWS EC2 instance using Pulumi (TypeScript)** with flexible networking, security, and configuration options.

The infrastructure supports:

- Primary network interface
- Optional secondary network interface
- Optional Elastic IP
- Configurable security group rules
- IAM role and instance profile
- Encrypted EBS root volume
- Environment-driven configuration

---

# Configuration

All configuration values are supplied using **environment variables** (usually through a `.env` file).

These variables control:

- EC2 instance configuration
- networking
- security groups
- storage
- monitoring
- Elastic IP configuration

---

# Example Configuration

Example `.env` file:

EC2_NAME=EVOTABVPN_PULUMI
EC2_AMI_ID=ami-003c670ea14ca1ddd
VPC_ID=vpc-00deccb411da52653
EC2_INSTANCE_TYPE=c7gn.large

EC2_ENABLE_DETAILED_MONITORING=false

EC2_ALLOWED_INGRESS_CIDRS=[
 {"ports":{"from":22,"to":22},"cidrIp":"0.0.0.0/0","ipProtocol":"tcp","description":"SSH Access"}
]

EC2_ALLOWED_SECONDARY_INGRESS_CIDRS=[
 {"ports":{"from":443,"to":443},"cidrIp":"10.0.0.0/16","ipProtocol":"tcp","description":"Internal HTTPS"}
]

EC2_VOLUME_SIZE=20
EC2_KEY_NAME=Fortigate_OFT_Test

EC2_ENABLE_EIP=true
EC2_ENABLE_SECONDARY_ENI=true

EC2_PRIMARY_ENI_SUBNET_TYPE=public
EC2_SECONDARY_ENI_SUBNET_TYPE=private

EC2_PUBLIC_SUBNET_ID=
EC2_PRIVATE_SUBNET_ID=

---

# Configuration Variables

## EC2_NAME
Name prefix used for all AWS resources created by this deployment.

Example:

EC2_NAME=my-ec2-instance

---

## EC2_AMI_ID
Specifies the Amazon Machine Image (AMI) used to launch the EC2 instance.

Example:

EC2_AMI_ID=ami-003c670ea14ca1ddd

---

## VPC_ID
Defines the AWS Virtual Private Cloud where the EC2 instance and networking resources will be deployed.

Example:

VPC_ID=vpc-xxxxxxxx

---

## EC2_INSTANCE_TYPE
Defines the EC2 compute size.

Examples:

t3.micro  
t3.medium  
c7gn.large

Example:

EC2_INSTANCE_TYPE=t3.medium

---

## EC2_ENABLE_DETAILED_MONITORING

Enables CloudWatch detailed monitoring.

Values:

true  
false

Example:

EC2_ENABLE_DETAILED_MONITORING=true

---

# Security Group Configuration

## EC2_ALLOWED_INGRESS_CIDRS

Defines inbound security rules for the **primary network interface**.

Example:

[
 {
  "ports":{"from":22,"to":22},
  "cidrIp":"0.0.0.0/0",
  "ipProtocol":"tcp",
  "description":"SSH Access"
 }
]

---

## EC2_ALLOWED_SECONDARY_INGRESS_CIDRS

Defines inbound rules for the **secondary network interface**.

Example:

[
 {
  "ports":{"from":443,"to":443},
  "cidrIp":"10.0.0.0/16",
  "ipProtocol":"tcp",
  "description":"Internal HTTPS"
 }
]

---

# Storage Configuration

## EC2_VOLUME_SIZE

Defines the root EBS volume size in GB.

Example:

EC2_VOLUME_SIZE=20

---

# SSH Access Configuration

## EC2_KEY_NAME

Specifies the AWS key pair used to SSH into the EC2 instance.

Example:

EC2_KEY_NAME=my-keypair

Example login:

ssh ec2-user@public-ip

---

# Network Architecture

This deployment supports **two network interfaces**.

EC2 Instance  
│  
├── Primary Network Interface (eth0)  
│  
└── Secondary Network Interface (eth1) [optional]

---

# Primary Network Interface (eth0)

Handles internet or primary traffic.

Configured using:

EC2_PRIMARY_ENI_SUBNET_TYPE

Values:

public  
private

Example:

EC2_PRIMARY_ENI_SUBNET_TYPE=public

---

# Secondary Network Interface (eth1)

Optional interface used for internal communication.

Enable:

EC2_ENABLE_SECONDARY_ENI=true

Subnet type:

EC2_SECONDARY_ENI_SUBNET_TYPE=private

---

# Elastic IP Configuration

Elastic IP provides a static public IP.

Enable:

EC2_ENABLE_EIP=true

Important:

- Elastic IP attaches **only to the primary ENI**
- Primary ENI must be in a **public subnet**
- Secondary ENI is typically private

Example:

EC2_ENABLE_EIP=true  
EC2_PRIMARY_ENI_SUBNET_TYPE=public

---

# Optional Explicit Subnet Configuration

Users may optionally provide subnet IDs.

Example:

EC2_PUBLIC_SUBNET_ID=subnet-xxxxxxx  
EC2_PRIVATE_SUBNET_ID=subnet-yyyyyyy

If not provided, the system automatically discovers subnets.

---

# Deployment

Preview infrastructure:

pulumi preview

Deploy infrastructure:

pulumi up

Destroy infrastructure:

pulumi destroy

EOF
