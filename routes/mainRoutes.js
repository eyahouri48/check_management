// routes/mainRoutes.js
import PDFDocument from 'pdfkit';
import express from 'express';
import ensureCheckNotIssued from '../check/check.js';
import ensureAdmin from '../privileges/admin.js';
import ensureAgent from '../privileges/agent.js';
import ensureCashier from '../privileges/cashier.js';
import ensureAdminOrCashier from '../privileges/adminOrCashier.js';
import ensureAgentOrAdmin from '../privileges/adminOrAgent.js';
import { getFilteredChecks } from '../filter/filter.js'; 
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'check',
    password: '48?Oracle',
    port: 5432,
});

export default function(passport) {

    // Middleware to check if the user is authenticated
    const ensureAuthenticated = async (req, res, next) => {
        if  (req.isAuthenticated()) {
            try {
                const { rows } = await pool.query(`
                    SELECT u.iduser, u.username, u.fullName, r.name AS role
                    FROM users u
                    JOIN role r ON u.idRole = r.id
                    WHERE u.iduser = $1
                `, [req.user.iduser]);
    
                if (rows.length > 0) {
                    req.user = rows[0];
                    return next();
                } else {
                    return res.redirect('/login');
                }
            } catch (err) {
                console.error(err);
                return res.redirect('/login');
            }
        } else {
            res.redirect('/login');
        }
    };
    router.get('/', ensureAuthenticated, (req, res) => {
        //console.log(req.user.iduser);
        res.render('dashboard');
    });

    router.get('/dashboard', ensureAuthenticated, (req, res) => {

        res.render('dashboard');
    });


    router.get('/404', (req, res) => {
       
        res.render('404');
    });

    router.get('/charts', ensureAuthenticated, (req, res) => {
        const userRole = req.user.function ? req.user.function : 'Undefined'; // Adjust this according to how you store the role
        res.render('charts',{userRole});
    });

    router.get('/tables', ensureAuthenticated, (req, res) => {
        const userRole = req.user.function ? req.user.function : 'Undefined'; // Adjust this according to how you store the role
        res.render('tables',{userRole});
    });

    router.get('/login', (req, res) => {
        const message = req.flash('error');
        res.render('login', { message });
    });

    router.get('/banks', ensureAuthenticated,ensureAdmin,  async (req, res) => {
  
        try {

            const result = await pool.query('SELECT code, name FROM bank WHERE supprime = false');
            const banks = result.rows;
            res.render('banks', { banks});
        } catch (err) {
            console.error(err);
            res.status(500).send("Error retrieving banks from database.");
        }
    });
    
    router.get('/add/bank',ensureAdmin, (req, res) => {
     
        res.render('add-bank');
    });
    

    router.post('/banks/add',ensureAdmin, async (req, res) => {
        const { name } = req.body;
    
        try {
            // Check if the bank name already exists
            const existingBank = await pool.query('SELECT * FROM bank WHERE LOWER(name) = LOWER($1)', [name]);
    
            if (existingBank.rows.length > 0) {
                // Render the form with an alert message if the bank name exists
                return res.render('add-bank', { errorMessage: 'Bank with this name already exists.' });
            }
    
            // Get the current maximum code from the bank table
            const result = await pool.query('SELECT COALESCE(MAX(code), 9999) AS max_code FROM bank');
            const maxCode = result.rows[0].max_code;
            const nextCode = maxCode + 1;
    
            // Ensure the nextCode is at least 10000
            const finalCode = Math.max(nextCode, 10000);
    
            // Insert the new bank with the calculated code
            await pool.query('INSERT INTO bank (code, name) VALUES ($1, $2)', [finalCode, name]);
    
            res.redirect('/banks');
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    
    
    
   
    router.get('/banks/edit/:code',ensureAdmin, async (req, res) => {
     
        const bankCode = req.params.code;
    
        try {
            const result = await pool.query('SELECT * FROM bank WHERE code = $1', [bankCode]);
            const bank = result.rows[0];
            res.render('edit-bank', { bank });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    

     router.post('/banks/edit/:code',ensureAdmin, async (req, res) => {
        const bankCode = req.params.code;
        const { name } = req.body;
    
        try {
            await pool.query('UPDATE bank SET name = $1 WHERE code = $2', [name, bankCode]);
            res.redirect('/banks'); 
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    
router.post('/banks/delete/:code',ensureAdmin, async (req, res) => {
    const bankCode = req.params.code;

    try {
        // Update the 'supprime' field of the bank with the given code
        await pool.query('UPDATE bank SET supprime = true WHERE code = $1', [bankCode]);

        // Redirect back to the view banks page
        res.redirect('/banks');
    } catch (error) {
        console.error('Error deleting bank:', error);
        res.status(500).send('Server Error');
    }
});
router.get('/accounts',ensureAdmin, async (req, res) => {
    try {
        // Fetch all accounts with the bank name
        const result = await pool.query(`
            SELECT a.num, b.name as bankName
            FROM account a
            JOIN bank b ON a.bankCode = b.code
            WHERE a.supprime = false
        `);
        const accounts = result.rows;
        console.log(accounts);
        // Render the accounts page with the list of accounts
        res.render('accounts', { accounts });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


router.get('/add-account',ensureAdmin, async (req, res) => {
    try {
        // Fetch all banks from the Bank table
        const result = await pool.query('SELECT code, name FROM bank WHERE supprime = false');
        const banks = result.rows;

        // Render the add-account page with the list of banks
        res.render('add-account', { banks });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


router.post('/add-account',ensureAdmin, async (req, res) => {
    const { bankCode } = req.body;
    try {
        // Determine the new account number
        const result = await pool.query('SELECT num FROM account ORDER BY num DESC LIMIT 1');
        const lastAccountNumber = result.rows[0] ? parseInt(result.rows[0].num, 10) : 9999999999;
        const newAccountNumber = (lastAccountNumber + 1).toString().padStart(11, '0');

        // Insert the new account with the generated number
        await pool.query(
            'INSERT INTO account (num, bankCode) VALUES ($1, $2)',
            [newAccountNumber, bankCode]
        );

        res.redirect('/accounts');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});




   // GET route to display the edit form
router.get('/accounts/edit/:num',ensureAdmin, async (req, res) => {
 
    const { num } = req.params;
    try {
        const accountQuery = 'SELECT * FROM account WHERE num = $1';
        const result = await pool.query(accountQuery, [num]);

        if (result.rows.length === 0) {
            return res.status(404).send('Account not found');
        }

        const account = result.rows[0];

        // Fetch all banks to display in the dropdown
        const banksQuery = 'SELECT * FROM bank WHERE supprime = false';
        const banksResult = await pool.query(banksQuery);

        res.render('edit-account', { account, banks: banksResult.rows });
    } catch (error) {
        console.error('Error fetching account:', error);
        res.status(500).send('Server Error');
    }
});


router.post('/accounts/edit/:num',ensureAdmin, async (req, res) => {
    const { num } = req.params;
    const { bankCode } = req.body;

    try {
        const updateQuery = 'UPDATE account SET bankCode = $1 WHERE num = $2';
        await pool.query(updateQuery, [bankCode, num]);

        res.redirect('/accounts');
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).send('Server Error');
    }
});

// POST route to "delete" an account by setting supprime to true
router.post('/accounts/delete/:num', ensureAdmin, async (req, res) => {
    const { num } = req.params;

    try {
        const deleteQuery = 'UPDATE account SET supprime = true WHERE num = $1';
        await pool.query(deleteQuery, [num]);

        res.redirect('/accounts');
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).send('Server Error');
    }
});
// Fetch accounts by bank code
// Fetch accounts by bank code
// Route to get accounts based on bank code
// Route to get accounts based on bank code
router.get('/accounts-by-bank', async (req, res) => {
    const bankCode = parseInt(req.query.bankCode, 10);
    try {
        if (!isNaN(bankCode)) {
            // Fetch accounts based on the bank code
            const result = await pool.query(`
                SELECT num FROM account
                WHERE bankCode = $1 AND supprime = false
            `, [bankCode]);

            // Send the accounts as JSON
            res.json({ accounts: result.rows });
        } else {
            res.status(400).send('Invalid bank code');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/emission', ensureAuthenticated, async (req, res) => {
    try {
        const { rows: checks } = await pool.query(`
            SELECT num, amount, beneficiary, creationDate, valueDate, entryDate, issueDate, type, bankCode, accountNum, createdBy, updatedBy
            FROM cheque
            WHERE supprime = false
        `);

        // Check if req.user exists and log its contents
        console.log('User:', req.user);
       // console.log(req.user.role);
        //console.log(checks);
        res.render('emission', { 
            checks,
            userRole: req.user ? req.user.role : 'guest' // Pass the user's role to the template
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}); 





router.get('/add-check', ensureAgentOrAdmin, async (req, res) => {
    try {
        // Fetch all bank codes and names from the Bank table
        const bankResult = await pool.query('SELECT code, name FROM bank WHERE supprime = false');
        const banks = bankResult.rows;

        // Render the add-check page with the list of banks
        res.render('add-check', { banks });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
/* router.get('/add-check-admin',ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        // Fetch all bank codes and names from the Bank table
        const bankResult = await pool.query('SELECT code, name FROM bank WHERE supprime = false');
        const banks = bankResult.rows;

        // Render the add-check page with the list of banks
        res.render('add-check-admin', { banks });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}); */

router.post('/add-check', ensureAgentOrAdmin, async (req, res) => {
    const { amount, beneficiary, valueDate, bankCode, accountNum, type } = req.body;

    try {
        // Check if the amount is provided
        if (!amount || amount <= 0) {
            return res.status(400).send('Amount is required and must be greater than zero.');
        }

        const year = new Date().getFullYear();
        const { rows } = await pool.query('SELECT MAX(num) AS maxnum FROM cheque');
        
        // Convert maxnum to string and handle the case where it might be null
        let nextNum = rows[0].maxnum ? parseInt(String(rows[0].maxnum).slice(4)) + 1 : 1;
        const formattedNum = `${year}${nextNum.toString().padStart(6, '0')}`;

        // Insert the new check into the database
        await pool.query(
            `INSERT INTO cheque (num, amount, beneficiary, valueDate, bankCode, accountNum, type, createdBy) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [formattedNum, amount, beneficiary, valueDate, bankCode, accountNum, type, req.user.iduser]
        );

        res.redirect('/emission');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});




/* router.get('/checks/edit/:num',ensureCheckNotIssued, async (req, res) => {

    const checkNum = parseInt(req.params.num, 10);
    console.log(`Edit route called with num: ${checkNum}`);
    try {
        const check = await pool.query('SELECT * FROM Cheque WHERE num = $1', [checkNum]);
        if (check.rows.length > 0) {
            res.render('edit-check', { check: check.rows[0], req });
        } else {
            res.status(404).send('Check not found');
        }
    } catch (error) {
        console.error(`Error fetching check with number ${checkNum}:`, error);
        res.status(500).send('Server error');
    }
});

  
router.post('/checks/update/:num', async (req, res) => {
    if (req.query._method === 'PUT') {
        const checkNum = parseInt(req.params.num, 10);
        const { entryDate, issueDate, type } = req.body;
        const updatedBy = req.user ? req.user.iduser : null;

        try {
            // Initialize the query and parameters array
            let query = 'UPDATE cheque SET ';
            const queryParams = [];
            let queryIndex = 1;

            // Conditionally add each attribute to the query if it's provided
            if (entryDate) {
                query += `entryDate = $${queryIndex}, `;
                queryParams.push(entryDate);
                queryIndex++;
            }
            if (issueDate) {
                query += `issueDate = $${queryIndex}, `;
                queryParams.push(issueDate);
                queryIndex++;
            }
            if (type) {
                query += `type = $${queryIndex}, `;
                queryParams.push(type);
                queryIndex++;
            }

            // Always add the updatedBy field and checkNum as they are required
            query += `updatedBy = $${queryIndex} WHERE num = $${queryIndex + 1}`;
            queryParams.push(updatedBy, checkNum);

            // Execute the query
            await pool.query(query, queryParams);

            res.redirect('/emission');
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
}); */
router.get('/checks/edit/admin/:num', ensureAdmin, ensureCheckNotIssued, async (req, res) => {
    try {
        const checkNum = req.params.num;

        // Fetch check details by check number
        const checkQuery = 'SELECT * FROM cheque WHERE num = $1';
        const checkResult = await pool.query(checkQuery, [checkNum]);

        if (checkResult.rows.length === 0) {
            return res.status(404).render('404', { message: 'Check not found' });
        }

        const check = checkResult.rows[0];

        // Fetch all banks
        const banksQuery = 'SELECT * FROM bank';
        const banksResult = await pool.query(banksQuery);
        const banks = banksResult.rows;

        // Fetch accounts for the selected bank if needed
        const accountsQuery = 'SELECT * FROM account WHERE bankCode = $1';
        const accountsResult = await pool.query(accountsQuery, [check.bankCode]);
        const accounts = accountsResult.rows;

        // Render the edit-check-admin page
        res.render('edit-check-admin', {
            check,
            banks,
            accounts,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching check details:', error);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
});

// Route for updating a check by an admin
router.post('/checks/update/admin/:num', ensureAdmin, async (req, res) => {
    const checkNum = req.params.num;
    const { amount, beneficiary, valueDate, bankCode, accountNum, entryDate, issueDate, type, updatedBy } = req.body;

    try {
        // Update the check details in the database
        const updateQuery = `
            UPDATE cheque
            SET 
                amount = $1,
                beneficiary = $2,
                valueDate = $3,
                bankCode = $4,
                accountNum = $5,
                entryDate = $6,
                issueDate = $7,
                type = $8,
                updatedBy = $9
            WHERE num = $10
        `;
        await pool.query(updateQuery, [
            amount,
            beneficiary,
            valueDate || null,
            bankCode,
            accountNum,
            entryDate || null,
            issueDate || null,
            type,
            updatedBy,
            checkNum
            
        ]);

        res.redirect('/emission'); // Redirect to the list of checks or another relevant page
    } catch (error) {
        console.error('Error updating check:', error);
        res.status(500).render('404', { message: 'Internal Server Error' });
    }
});


router.get('/checks/edit/agent/:num', ensureAgent, async (req, res) => {
    const checkNum = parseInt(req.params.num, 10);
  
    try {
      // Fetch check details
      const checkResult = await pool.query('SELECT * FROM cheque WHERE num = $1', [checkNum]);
      const check = checkResult.rows[0];
  
      if (!check) {
        return res.status(404).send('Check not found');
      }
  
      // Fetch list of banks
      const banksResult = await pool.query('SELECT * FROM bank');
      const banks = banksResult.rows;
  
      // Fetch list of accounts
      const accountsResult = await pool.query('SELECT * FROM account WHERE bankCode = $1', [check.bankCode]);
      const accounts = accountsResult.rows;
  
      // Render the agent's edit check page
      res.render('edit-check-agent', {
        check,
        banks,
        accounts,
        req,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });
  router.get('/checks/edit/cashier/:num', ensureCashier,ensureCheckNotIssued, async (req, res) => {
    const checkNum = parseInt(req.params.num, 10);
  
    try {
      // Fetch check details
      const checkResult = await pool.query('SELECT * FROM cheque WHERE num = $1', [checkNum]);
      const check = checkResult.rows[0];
  
      if (!check) {
        return res.status(404).send('Check not found');
      }
  
      // Render the cashier's edit check page
      res.render('edit-check-cashier', {
        check,
        req,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });

// POST route to update check by Agent
// POST route to update check by Agent
// POST route to update check by Agent
/* router.post('/checks/update/agent/:num', ensureAgent, async (req, res) => {
    const checkNum = parseInt(req.params.num, 10);
    const { amount, beneficiary, valueDate, bankCode, accountNum } = req.body;

    try {
        // Update the check details in the database
        const updateQuery = `
            UPDATE cheque
            SET amount = $1,
                beneficiary = $2,
                valueDate = $3,
                bankCode = $4,
                accountNum = $5,
                updatedBy = $6
            WHERE num = $7
            RETURNING *;
        `;

        const updateValues = [
            amount, 
            beneficiary, 
            valueDate || null, 
            bankCode, 
            accountNum || null, 
            req.user.iduser, // The ID of the user making the update
            checkNum
        ];

        const result = await pool.query(updateQuery, updateValues);

        if (result.rowCount === 0) {
            return res.status(404).send('Check not found or no changes made');
        }

        // Redirect back to the emission page after a successful update
        res.redirect('/emission');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}); */
router.post('/checks/update/agent/:num', ensureAgent, async (req, res) => {
    const checkNum = parseInt(req.params.num, 10);

    // Log the incoming form data to debug
    console.log('Form data:', req.body);

    const { amount, beneficiary, valueDate, bankCode, accountNum, updatedBy } = req.body;

    try {
        // Verify that the bankCode is being correctly retrieved from the form
        console.log('Bank Code:', bankCode);
        console.log('Account Number:', accountNum);
        console.log('Updated By:', updatedBy);

        const updateQuery = `
            UPDATE cheque
            SET amount = $1,
                beneficiary = $2,
                valueDate = $3,
                bankCode = $4,
                accountNum = $5,
                updatedBy = $6
            WHERE num = $7
            RETURNING *;
        `;

        const updateValues = [
            amount, 
            beneficiary, 
            valueDate || null, 
            bankCode, 
            accountNum || null, 
            updatedBy, // The ID of the user making the update
            checkNum
        ];

        const result = await pool.query(updateQuery, updateValues);

        if (result.rowCount === 0) {
            return res.status(404).send('Check not found or no changes made');
        }

        // Redirect back to the emission page after a successful update
        res.redirect('/emission');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.post('/checks/update/cashier/:num',ensureCashier, async (req, res) => {
      const checkNum = parseInt(req.params.num, 10);
      const { entryDate, issueDate, type } = req.body;
      const updatedBy = req.user ? req.user.iduser : null;
  
      try {
        await pool.query(
          'UPDATE Cheque SET entryDate = $1, issueDate = $2, type = $3, updatedBy = $4 WHERE num = $5',
          [entryDate, issueDate, type, updatedBy, checkNum]
        );
        res.redirect('/emission');
      } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
      }
  
  });

router.post('/checks/delete/:num',ensureCheckNotIssued , async (req, res) => {
    const { num } = req.params;
  
    try {
   
      await pool.query('UPDATE cheque SET supprime = true WHERE num = $1', [num]);
  
    
      res.redirect('/emission');
    } catch (err) {
      console.error('Error deleting check:', err);
      res.status(500).send('Server Error');
    }
  });
  
  router.get('/search-results', async (req, res) => {
  
    const { creationDate, valueDate, entryDate, issueDate, type } = req.query;
    
    try {
      const filteredChecks = await getFilteredChecks({ creationDate, valueDate, entryDate, issueDate, type });
      res.render('search-results', {
        filteredChecks,
        query: req.query,
       
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("There was an error fetching the filtered checks.");
    }
});

router.get('/download-pdf', async (req, res) => {
    const { creationDate, valueDate, entryDate, issueDate, type } = req.query;

    try {
        const filteredChecks = await getFilteredChecks({ creationDate, valueDate, entryDate, issueDate, type });
        const doc = new PDFDocument({ margin: 30 });
        let filename = 'filtered-checks.pdf';
        filename = encodeURIComponent(filename);
        
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        // Title
        doc.fontSize(20).text('Overview of Filtered Checks', { align: 'center' }).moveDown(1.5);

        // Table Headers
        const tableTop = 120;
        const tableHeaders = ['Account Number', 'Amount', 'Beneficiary', 'Type'];
        const columnWidths = [150, 100, 150, 80];
        
        doc.fontSize(12).font('Helvetica-Bold');
        tableHeaders.forEach((header, i) => {
            doc.text(header, 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, { width: columnWidths[i], align: 'center' });
        });

        // Divider line under headers
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table Rows
        const rowHeight = 20;
        let yPos = tableTop + 25;

        doc.fontSize(10).font('Helvetica');
        filteredChecks.forEach((check, index) => {
            const isEvenRow = index % 2 === 0;
            if (isEvenRow) {
                doc.rect(50, yPos, 500, rowHeight).fill('#f3f3f3').fillColor('#000000');
            }

            // Safely access and display each check attribute
            const rowValues = [
                check.accountnum ? check.accountnum.toString() : 'N/A',
                check.amount ? check.amount.toString() : 'N/A',
                check.beneficiary ? check.beneficiary.toString() : 'N/A',
                check.type ? check.type.toString() : 'N/A'
            ];

            rowValues.forEach((value, i) => {
                doc.text(value, 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), yPos, { width: columnWidths[i], align: 'center' });
            });

            yPos += rowHeight;
        });

        // Print Date
        doc.moveDown(2).fontSize(10).font('Helvetica-Oblique').text(`Printed on: ${new Date().toLocaleString()}`, { align: 'right' });

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('There was an error generating the PDF.');
    }
});


 
 

  
    router.get('/logout', (req, res, next) => {
        req.logout(err => {
            if (err) {
                return next(err);
            }
            res.redirect('/login');
        });
    });

    router.post('/login',
        passport.authenticate('local', {
            successRedirect: '/dashboard',
            failureRedirect: '/login',
            failureFlash: true
        })
    );

    // Catch-all route for 404
    router.use((req, res) => {
        res.status(404).render('404');
    });

    return router;
}