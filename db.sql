create table role (
id serial primary key, 
name varchar (50) NOT NULL,
supprime boolean default false );


create table users (
idUser serial primary key,
username varchar(50) NOT NULL,
password varchar(50) NOT NULL,
fullName varchar(50) NOT NULL,
function varchar(50) NOT NULL,
idRole int ,
FOREIGN KEY (idRole) REFERENCES Role(id),
supprime boolean default false );


create table bank (
code serial primary key,
name varchar(50),
supprime boolean default false );


create table account (
num serial primary key ,
bankCode int,
FOREIGN KEY(bankCode) REFERENCES Bank(code),
supprime boolean default false );


create table cheque (
num serial primary key ,
amount float NOT NULL,
benefeciary varchar(50) NOT NULL,
creationDate date ,
valueDate date ,
entryDate date ,
issueDate date ,
type char ,
bankCode int NOT NULL ,
accountNum int ,
idAgent int ,
idCaissier int ,
FOREIGN KEY(accountNum) REFERENCES Account(num),
supprime boolean default false );