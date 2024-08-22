create table role (
id serial primary key, 
name varchar (50) NOT NULL,
supprime boolean default false );


create table users (
idUser serial primary key,
username varchar(50) NOT NULL,
password varchar(50) NOT NULL,
fullName varchar(50) NOT NULL,
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

CREATE TABLE cheque (
    num SERIAL PRIMARY KEY,
    amount FLOAT NOT NULL,
    beneficiary VARCHAR(50) NOT NULL,
    creationDate DATE DEFAULT NOW(),
    valueDate DATE,
    entryDate DATE,
    issueDate DATE,
    type CHAR,
    bankCode INT NOT NULL,
    accountNum INT,
    createdBy VARCHAR(50),         
    updatedBy VARCHAR(50),        
    FOREIGN KEY (accountNum) REFERENCES Account(num),
    supprime BOOLEAN DEFAULT FALSE
);

insert into users (idUser,username,password,fullName,function,idRole,supprime) values (1,'eya','eya','tfytfyf','agent',2,false);