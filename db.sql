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

CREATE TABLE cheque (
    num SERIAL PRIMARY KEY,-- filtre--
    amount FLOAT NOT NULL,--filtre--
    beneficiary VARCHAR(50) NOT NULL,--filtre--
    creationDate DATE DEFAULT NOW(),--filtre--
    valueDate DATE,--filtre--
    entryDate DATE,--filtre--
    issueDate DATE,--filtre--
    type CHAR,--filtre--
    bankCode INT NOT NULL,
    accountNum INT,
    createdBy INT,         
    updatedBy INT,        
    FOREIGN KEY (accountNum) REFERENCES Account(num),
    FOREIGN KEY (createdBy) REFERENCES users(idUser),
    FOREIGN KEY (updatedBy) REFERENCES users(idUser),
    supprime BOOLEAN DEFAULT FALSE
);

insert into users (idUser,username,password,fullName,function,idRole,supprime) values (1,'eya','eya','tfytfyf','agent',2,false);