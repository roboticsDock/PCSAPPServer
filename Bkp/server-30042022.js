var config = require('./config/default.json');
const express = require('express');
const app = express();

//const router = express.Router();
const cors = require('cors');
app.use('*', cors());

const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({
    limit: "50mb",
    extended: false
  }));
app.use(bodyParser.json({limit: "50mb"}));

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
    user: config.DB.AWSMSSQL.user,
    password: config.DB.AWSMSSQL.password,
    server: config.DB.AWSMSSQL.server, 
    database: config.DB.AWSMSSQL.database,
    trustServerCertificate: config.DB.AWSMSSQL.trustServerCertificate
}


app.use(bodyParser.urlencoded({extended:true}))


//const db = mssql.connect(config);

app.get("/api/columns",(req, res) => {
    const sqlSelect = "SELECT TOP (5) * FROM [CustomerInvtryDetails]";
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
    const sqlGetRowsCount = "SELECT count(ClientID) As Count FROM [ProductInventoryDetails] where ClientID ='"+ClientID+"'";
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
    const sqlGetRows = "Update [ProductInventoryDetails] set ScannedBy='"+userID+"'"+
    ", ScannedTimeStamp=CURRENT_TIMESTAMP, ScannedStatus = 'Scanned' where ScannedStatus != 'Scanned' and ClientID ='"+ClientID+"' and PartPositionNoBarcode = '"+BarCode+"'";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlGetRows, (err,result) => { 
            //console.log(result);
            res.send(result);
            return result;
        })   
    }) 
})

app.post("/api/RejectInventory",(req, res) => {
    const ClientID =req.body.clientID;
    const BarCode =req.body.barCode;
    const userID =req.body.userID;
    //console.log(req.body)
    const sqlRejectInventory = "Update [ProductInventoryDetails] set ScannedBy='"+userID+"'"+
    ", ScannedTimeStamp=CURRENT_TIMESTAMP, ScannedStatus = 'Rejected' where ClientID ='"+ClientID+"' and PartPositionNoBarcode = '"+BarCode+"'";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlRejectInventory, (err,result) => { 
            //console.log(result);
            res.send(result);
            return result;
        })   
    }) 
})



app.post("/api/InsertInv", (req, res) => {
    const excelData = req.body.data;
    const fileType = req.body.FileType
    const ClientID =req.body.clientID;
    const userId =req.body.userID;
    const pcsClient =req.body.PCSClient;
    const DocType = (fileType) ? "Nucleus" : "IMOS";
    const ScannedStatus ="No";

    let InsNonNucleus = "";
    let InsNucleus = "";
    excelData.map((item,index) => { 
        if(item[1] !== undefined) {
            const OrderNo = item[0];
            let OrderName = item[1];
            OrderName = OrderName.replace(/'/g, `''`);
            const OrderDate = item[2];
            const Description = item[4];
            const PartPositionNoBarcode = item[5];
            const MaterialCode = (fileType) ? item[6] : item[7];
            const CuttingWidth = item[16];
            const CuttingLength = item[17];
            const CuttingThickness = (fileType) ? item[9] : item[18];
            const FinishedLength = (fileType) ? item[7] : item[19];
            const FinishedWidth = (fileType) ? item[8] : item[20];
            const InventoryDetailsJSON = JSON.stringify(item).replace(/'/g, `''`);
            const Quantity = item[22];
        
        if(fileType){
            InsNucleus += " "+
            "IF NOT EXISTS(Select * from [ProductInventoryDetails] where PartPositionNoBarcode= '"+PartPositionNoBarcode+"' and ClientID = '"+ClientID+"')"+
            " INSERT INTO [ProductInventoryDetails] (ClientID,OrderName,Description,PartPositionNoBarcode,InventoryDetailsJSON,ScannedStatus,UploadedBy,MaterialCode,CuttingThickness,FinishedLength,FinishedWidth,PCSClient,DocType)"+
            " VALUES ('"+ClientID+"','"+OrderName+"','"+Description+"','"+PartPositionNoBarcode+"','"+InventoryDetailsJSON+"','"+ScannedStatus+"','"+userId+"','"+MaterialCode+"','"+CuttingThickness+"','"+FinishedLength+"','"+FinishedWidth+"','"+pcsClient+"','"+DocType+"')"
        
        }else{
            InsNonNucleus += " "+
            "IF NOT EXISTS(Select * from [ProductInventoryDetails] where PartPositionNoBarcode= '"+PartPositionNoBarcode+"' and ClientID = '"+ClientID+"')"+
            " INSERT INTO [ProductInventoryDetails] (ClientID,OrderName,OrderDate,Description,PartPositionNoBarcode,InventoryDetailsJSON,ScannedStatus,UploadedBy,MaterialCode,CuttingWidth,CuttingLength,CuttingThickness,FinishedLength,FinishedWidth,Quantity,PCSClient,DocType)"+
            " VALUES ('"+ClientID+"','"+OrderName+"','"+OrderDate+"','"+Description+"','"+PartPositionNoBarcode+"','"+InventoryDetailsJSON+"','"+ScannedStatus+"','"+userId+"','"+MaterialCode+"','"+CuttingWidth+"','"+CuttingLength+"','"+CuttingThickness+"','"+FinishedLength+"','"+FinishedWidth+"','"+Quantity+"','"+pcsClient+"','"+DocType+"')";
        
        } 
        }
    })
    res.setHeader("Content-Type", "text/html");
        const sqlInsertRows = (fileType) ? InsNucleus : InsNonNucleus;
        const db = mssql.connect(conn).then(pool => {
            return pool.request()
            .query(sqlInsertRows, (err,result) => {     
                if(result)
                    res.status(200).send({status: 'OK', message: "Excel Uploaded"});
                else 
                res.status(500).send({status: 'Failed', message: "Internal Server Error"}); 
            })
        })
    //console.log(excelData)
    /*
    const sqlInsert = "";
    const fileType = req.body.FileType
    const ClientID =req.body.clientID;
    const userId =req.body.userID;
    const pcsClient =req.body.PCSClient;
    const OrderNo =req.body.tableData[0];
    let OrderName = req.body.tableData[1];
    OrderName = OrderName.replace(/'/g, `''`);
    const OrderDate =req.body.tableData[2];
    const Description =req.body.tableData[4];
    const PartPositionNoBarcode = req.body.tableData[5];
    const MaterialCode = (fileType) ? req.body.tableData[6] : req.body.tableData[7];
    const CuttingWidth =req.body.tableData[16];
    const CuttingLength =req.body.tableData[17];
    const CuttingThickness = (fileType) ? req.body.tableData[9] : req.body.tableData[18];
    const FinishedLength = (fileType) ? req.body.tableData[7] : req.body.tableData[19];
    const FinishedWidth = (fileType) ? req.body.tableData[8] : req.body.tableData[20];
    const DocType = (fileType) ? "Nucleus" : "IMOS";

    const Quantity =req.body.tableData[22];

    const InventoryDetailsJSON = req.body.JSONData
    const ScannedStatus ="No";
    const InsNonNucleus = "IF NOT EXISTS(Select * from [ProductInventoryDetails] where PartPositionNoBarcode= '"+PartPositionNoBarcode+"')"+
    "INSERT INTO [ProductInventoryDetails] (ClientID,OrderName,OrderDate,Description,PartPositionNoBarcode,InventoryDetailsJSON,ScannedStatus,UploadedBy,MaterialCode,CuttingWidth,CuttingLength,CuttingThickness,FinishedLength,FinishedWidth,Quantity,PCSClient,DocType)"+
    "VALUES ('"+ClientID+"','"+OrderName+"','"+OrderDate+"','"+Description+"','"+PartPositionNoBarcode+"','"+InventoryDetailsJSON+"','"+ScannedStatus+"','"+userId+"','"+MaterialCode+"','"+CuttingWidth+"','"+CuttingLength+"','"+CuttingThickness+"','"+FinishedLength+"','"+FinishedWidth+"','"+Quantity+"','"+pcsClient+"','"+DocType+"')";
    //console.log(sqlInsertRows)
    
    const InsNucleus = "IF NOT EXISTS(Select * from [ProductInventoryDetails] where PartPositionNoBarcode= '"+PartPositionNoBarcode+"')"+
    "INSERT INTO [ProductInventoryDetails] (ClientID,OrderName,Description,PartPositionNoBarcode,InventoryDetailsJSON,ScannedStatus,UploadedBy,MaterialCode,CuttingThickness,FinishedLength,FinishedWidth,PCSClient,DocType)"+
    "VALUES ('"+ClientID+"','"+OrderName+"','"+Description+"','"+PartPositionNoBarcode+"','"+InventoryDetailsJSON+"','"+ScannedStatus+"','"+userId+"','"+MaterialCode+"','"+CuttingThickness+"','"+FinishedLength+"','"+FinishedWidth+"','"+pcsClient+"','"+DocType+"')"

    const sqlInsertRows = (fileType) ? InsNucleus : InsNonNucleus;
    
    /*
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlInsertRows, (err,result) => { 
            if(result)
                res.sendStatus(200)
            else
                res.sendStatus(500)
            return res;
        })   
    })*/
})

app.post("/api/rows",(req, res) => {
    const ClientID =req.body.clientID;
    const fileType = req.body.FileType;

    const getImos = "Select ClientID,OrderName,OrderDate,Description,PartPositionNoBarcode,ScannedStatus,MaterialCode,CuttingWidth,CuttingLength,CuttingThickness,FinishedLength,FinishedWidth,Quantity FROM [ProductInventoryDetails] where ClientID='"+ClientID+"'";    
    const getNucleus = "Select ClientID,OrderName,Description,PartPositionNoBarcode,ScannedStatus,MaterialCode,FinishedLength,FinishedWidth,CuttingThickness as FinishedThickness FROM [ProductInventoryDetails] where ClientID='"+ClientID+"'";
    
    const sqlGetRows = (fileType) ? getNucleus : getImos;
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlGetRows, (err,result) => { 
            res.send(result);
        })   
    }) 
})

// Get Data on Scanned Status
/*
app.post("/api/ScannedStatusRows",(req, res) => {
    const ClientID =req.body.clientID;
    const ScanStatus =req.body.scanStatus;
    const sqlGetRows = "Select ClientID,OrderName,OrderDate,Description,PartPositionNoBarcode,ScannedStatus,MaterialCode,CuttingWidth,CuttingLength,CuttingThickness,FinishedLength,FinishedWidth,Quantity FROM [ProductInventoryDetails] where ClientID='"+ClientID+"' and ScannedStatus='"+ScanStatus+"'";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlGetRows, (err,result) => { 
            //console.log(result);
            res.send(result);
        })   
    }) 
})
*/
app.listen(config.APIURL.PORT,() => {
    console.log("Running on node port "+config.APIURL.PORT)
})

//Delete ClientID

app.post("/api/deleteClient",(req, res) => {
    const ClientID =req.body.clientID;
    const sqlGetRows = "DELETE FROM [ProductInventoryDetails] where ClientID='"+ClientID+"'";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlGetRows, (err,result) => { 
            //console.log(result);
            res.send(result);
        })   
    }) 
})


// LoginCheck

app.post("/api/GetCreds",(req, res) => {
    const UserName =req.body.userName;
    const sqlGetCreds = "Select C.Password Password,U.RoleID Role, Cl.CID Client, L.ExpiryDate LicenseExpire from [Credentials] C "+
                        "JOIN [Users] U ON(U.UID = C.PUID) JOIN [Client] Cl ON(Cl.CID = U.ClientID) JOIN [License] L ON(Cl.CID = L.ClientID) where [PUID] = (Select [UID] from [Users] where [UserName] = '"+UserName+"')"
    //Select [Password] from [Credentials] where [PUID] = (Select [UID] from [Users] where [UserName] = '"+UserName+"')";
    //console.log(sqlGetCreds)
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
    const sqlAddUser = "INSERT INTO [Users] (UserName, FirstName, LastName, Email, RoleID, ClientID)"+
    "VALUES ('"+userDetails.userName+"','"+userDetails.firstName+"','"+userDetails.lastName+"','"+userDetails.emailId+"',"+
    "(Select roleid from [Role] where role = '"+userDetails.role+"'),(Select CID from [Client] where ClientName = '"+userDetails.clientName+"'))"+
    "INSERT INTO [Credentials] (PUID, Password)"+
    "values ((Select UID from [Users] where UserName = '"+userDetails.userName+"'),'"+userDetails.password+"')"

    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlAddUser, (err,result) => { 
            return res;
        })   
    })

})


// Add Client

app.post("/api/AddClient",(req, res) => {

    const clientDetails =req.body.data;
    const sqlAddClient = "INSERT INTO [Client] ([ClientName]) VALUES ('"+clientDetails.clientName+"')"+
    "INSERT INTO [dbo].[License] ([ClientID],[StartDate],[ExpiryDate])"+
    "VALUES ((Select CID from [Client] where ClientName = '"+clientDetails.clientName+"'),'"+clientDetails.startDate+"','"+clientDetails.expiryDate+"')"
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlAddClient, (err,result) => { 
            return res;
        })   
    })

})

// Check if Client Exists

app.post("/api/CheckClient",(req, res) => {

    const clientDetails =req.body.data;
    const sqlCheckClient = "SELECT COUNT(*) As Count FROM [Client] WHERE ClientName = '"+clientDetails.clientName+"'";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlCheckClient, (err,result) => { 
            res.send(result);
        })   
    })

})


// Check if User Exists

app.post("/api/CheckUser",(req, res) => {

    const userDetails =req.body.data;
    const sqlCheckUser = "SELECT COUNT(*) As Count FROM [Users] WHERE username = '"+userDetails.userName+"' and ClientID = (Select CID from [Client] where ClientName = '"+userDetails.clientName+"')"
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlCheckUser, (err,result) => { 
            res.send(result);
        })   
    })

})


// Get Client list

app.get("/api/GetClientList",(req, res) => {
    const sqlClientList = "SELECT ClientName FROM [Client]";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlClientList, (err,result) => { 
            res.send(result);
        })   
    })

})


// Get Total Client Report

app.post("/api/GetClientIDReport",(req, res) => {
    const pcsClient = req.body.PCSClient
    let checkAdmin = (pcsClient !== 22) ? "AND P.PCSClient="+pcsClient+"" : ""
    const sqlClientIDReport = "Select distinct ClientID As 'ClientID', Count(*) as 'Total Records',"+
                            "Count(case when ScannedStatus = 'Scanned' then 1 else null end) as 'Total Scanned',"+
                            "Count(case when ScannedStatus = 'No' then 1 else null end) as 'Total UnScanned',"+
                            "MAX(FORMAT(UploadedTimeStamp, 'dd-MM-yyyy')) As 'Uploaded Date',"+
                            "MAX(FORMAT(ScannedTimeStamp, 'dd-MM-yyyy')) As 'Scanned Date',"+                            
							"MAX(C.ClientName) As 'PCS Client'"+
                            "from [ProductInventoryDetails] P,Client C where P.PCSClient=C.CID "+checkAdmin+" GROUP by ClientID"
                            //console.log(sqlClientIDReport)                        
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlClientIDReport, (err,result) => { 
            //console.log(result)
            res.send(result);
        })   
    })

})



// Get Report By Client

app.post("/api/GetReportByClient",(req, res) => {
    const ClientID =req.body.clientID;
    const sqlReportByClient = "Select Description,PartPositionNoBarcode,Quantity,ScannedStatus,UploadedBy,ScannedBy from [dbo].[ProductInventoryDetails]"+
                                " where ClientID='"+ClientID+"'";
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlReportByClient, (err,result) => { 
            res.send(result);
        })   
    })

})

// Get Complete Records

app.post("/api/GetTotalRecords",(req, res) => {
    const pcsClient = req.body.PCSClient
    let checkAdmin = (pcsClient !== 22) ? "where PCSClient="+pcsClient+"" : ""
    const sqlTotalRecords = "Select Count(*) as Count,Count(case when ScannedStatus = 'Scanned' then 1 else null end) as 'TotalScanned',"+
        "Count(case when ScannedStatus = 'No' then 1 else null end) as 'TotalUnScanned' from [dbo].[ProductInventoryDetails] "+checkAdmin;
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlTotalRecords, (err,result) => { 
            res.send(result);
        })   
    })

})


// DeleteClientList


app.post("/api/DeleteClientList",(req, res) => {
    const ClientIDList =req.body.clientIDList;
    console.log(ClientIDList);
    const sqlDeleteClient = "Deleted from [dbo].[ProductInventoryDetails] where";
    ClientIDList.map((cID,i) => (
        sqlDeleteClient+= (i>0) && "&&",
        sqlDeleteClient+=  "ClientID='"+cID+"'"
    ))
        console.log(sqlDeleteClient);




/*    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlDeleteClient, (err,result) => { 
            res.send(result);
        })   
    })*/

})


// Get License Details

// Get Complete Records

app.post("/api/GetLicenseDetails",(req, res) => {
    const pcsClient = req.body.PCSClient;
    const sqlGetLicenseDetails = "SELECT ExpiryDate FROM [dbo].[License] where ClientID = "+pcsClient;
    const db = mssql.connect(conn).then(pool => {
        return pool.request()
        .query(sqlGetLicenseDetails, (err,result) => { 
            res.send(result);
            //console.log(result)
        })   
    })

})


app.get('/', (req, res) => {
    res.send('Hello PCS APP!')
  });