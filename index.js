var config = require('./config/default.json');
const express = require('express');
const app = express();

//const router = express.Router();
const cors = require("cors");
app.use(cors());

app.use(express.json());
const bodyParser = require("body-parser");

const mssql = require('mssql');

/*
const db = mssql.createConnection(
    {
        
            host: "localhost",
            user: "testUser1",
            password:"Test@123",
            database:"PCS_Database"
        
    }
);
*/

const conn = {
    user: config.DB.MSSQL.user,
    password: config.DB.MSSQL.password,
    server: config.DB.MSSQL.server, 
    database: config.DB.MSSQL.database,
    trustServerCertificate: config.DB.MSSQL.trustServerCertificate
}


app.use(bodyParser.urlencoded({extended:true}))

//const db = mssql.connect(config);

app.get("/api/columns",(req, res) => {
    const sqlSelect = "SELECT TOP (5) * FROM [PCS_Database].[dbo].[CustomerInvtryDetails]";
    const sqlGetColumns = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProductInventoryDetails'";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlGetColumns, (err,result) => {
            //console.log(err);
            //console.log(result);
            res.send(result);
        })   
    }) 
})

// Check if Client exsists

app.post("/api/CheckClientExists",(req, res) => {    
    const ClientID =req.body.clientID;
    const sqlGetRowsCount = "SELECT count(ClientID) As Count FROM [PCS_Database].[dbo].[ProductInventoryDetails] where ClientID ='"+ClientID+"'";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlGetRowsCount, (err,result) => {
            //console.log(err);
            //console.log(result);
            res.send(result);
        })   
    }) 
})




app.post("/api/UpdateBarcodeScan",(req, res) => {
    const ClientID =req.body.clientID;
    const BarCode =req.body.barCode;
    const userID =req.body.userID;
    //console.log(req.body)
    const sqlGetRows = "Update [PCS_Database].[dbo].[ProductInventoryDetails] set ScannedBy='"+userID+"'"+
    ", ScannedTimeStamp=CURRENT_TIMESTAMP, ScannedStatus = 'Scanned' where ScannedStatus != 'Scanned' ClientID ='"+ClientID+"' and PartPositionNoBarcode = '"+BarCode+"'";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlGetRows, (err,result) => { 
            //console.log(result);
            res.send(result);
            return result;
        })   
    }) 
})



app.post("/api/InsertInv",(req, res) => {
    const sqlInsert = "";
    const ClientID =req.body.clientID;
    const userId =req.body.userID;
    const OrderNo =req.body.tableData[0];
    const OrderName =req.body.tableData[1];
    const OrderDate =req.body.tableData[2];
    const Description =req.body.tableData[4];
    const PartPositionNoBarcode =req.body.tableData[5];
    const InventoryDetailsJSON =JSON.stringify(req.body.tableData);
    //console.log(InventoryDetailsJSON);
    const ScannedStatus ="No";

    const sqlInsertRows = "INSERT INTO [PCS_Database].[dbo].[ProductInventoryDetails] (ClientID,OrderNo,OrderName,OrderDate,Description,PartPositionNoBarcode,InventoryDetailsJSON,ScannedStatus,UploadedBy) VALUES ('"+ClientID+"','"+OrderNo+"','"+OrderName+"','"+OrderDate+"','"+Description+"','"+PartPositionNoBarcode+"','"+InventoryDetailsJSON+"','"+ScannedStatus+"','"+userId+"')";
    //console.log(sqlInsertRows)
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlInsertRows, (err,result) => { 
            //console.log(result);
            res.send(result);
            return res;
        })   
    }) 

    
})

app.post("/api/rows",(req, res) => {
    const ClientID =req.body.clientID;
    const sqlGetRows = "Select ClientID,OrderNo,OrderName,OrderDate,Description,PartPositionNoBarcode,ScannedStatus FROM [PCS_Database].[dbo].[ProductInventoryDetails] where ClientID='"+ClientID+"'";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlGetRows, (err,result) => { 
            //console.log(result);
            res.send(result);
        })   
    }) 
})

app.listen(3001,() => {
    console.log("Running on node port 3001")
})



// LoginCheck

app.post("/api/GetCreds",(req, res) => {
    const UserName =req.body.userName;
    const sqlGetCreds = "Select [Password] from [PCS_Database].[dbo].[Credentials] where [PUID] = (Select [UID] from [PCS_Database].[dbo].[Users] where [UserName] = '"+UserName+"')";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlGetCreds, (err,result) => { 
            //console.log(result);
            res.send(result);
        })   
    }) 
})


// AddUser

app.post("/api/AddUser",(req, res) => {

    const userDetails =req.body.data;
    const sqlAddUser = "INSERT INTO [dbo].[Users] (UserName, FirstName, LastName, Email, RoleID)"+
    "VALUES ('"+userDetails.userName+"','"+userDetails.firstName+"','"+userDetails.lastName+"','"+userDetails.emailId+"',2)"+
    "INSERT INTO [PCS_Database].[dbo].[Credentials] (PUID, Password)"+
    "values ((Select UID from [PCS_Database].[dbo].[Users] where UserName = '"+userDetails.userName+"'),'"+userDetails.password+"')"

    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlAddUser, (err,result) => { 
            return res;
        })   
    })

})