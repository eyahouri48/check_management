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
router.use((req, res, next) => {
    if (req.user) {
        console.log('User with role:', req.user.role);
    } else {
        console.log('No user authenticated');
    }
    next();
});

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
        res.render('dashboard',{req});
    });

    router.get('/dashboard', ensureAuthenticated, (req, res) => {

        res.render('dashboard',{req});
    });


    router.get('/404', (req, res) => {
       
        res.render('404',{req});
    });

    router.get('/charts', ensureAuthenticated, (req, res) => {
       
        res.render('charts',{req});
    });

    router.get('/tables', ensureAuthenticated, (req, res) => {
    
        res.render('tables',{req});
    });

    router.get('/login', (req, res) => {
        const message = req.flash('error');
        res.render('login', { message });
    });




    router.get('/banks', ensureAuthenticated,ensureAdmin,  async (req, res) => {
  
        try {

            const result = await pool.query('SELECT code, name FROM bank WHERE supprime = false');
            const banks = result.rows;
            res.render('banks', { banks, req});
        } catch (err) {
            console.error(err);
            res.status(500).send("Error retrieving banks from database.");
        }
    });
    
    router.get('/add/bank',ensureAdmin, (req, res) => {
        console.log(req.user);
        res.render('add-bank',{req});
    });
    

    /* router.post('/banks/add', ensureAdmin, async (req, res) => {
        const { name, code } = req.body;
    
        try {
            // Check if the bank name or code already exists
            const nameQuery = 'SELECT * FROM bank WHERE name = $1';
            const codeQuery = 'SELECT * FROM bank WHERE code = $1';
    
            const nameResult = await pool.query(nameQuery, [name]);
            const codeResult = await pool.query(codeQuery, [code]);
    
            if (nameResult.rows.length > 0) {
                // Bank name already exists
                return res.render('add-bank', { errorMessage: 'Bank name already exists.' });
            }
    
            if (codeResult.rows.length > 0) {
                // Bank code already exists
                return res.render('add-bank', { errorMessage: 'Bank code already exists.' });
            }
    
            // Insert new bank if no duplicates are found
            const insertQuery = 'INSERT INTO bank (name, code) VALUES ($1, $2)';
            await pool.query(insertQuery, [name, code]);
    
            // Redirect to the bank list or another page after successful insertion
            res.redirect('/banks');
        } catch (error) {
            console.error('Error adding bank:', error);
            res.render('add-bank', { errorMessage: 'An error occurred while adding the bank.' });
        }
    }); */
    router.post('/banks/add', ensureAdmin, async (req, res) => {
        const { name, code } = req.body;
    
        try {
            // Check if the bank code is exactly 5 digits
            if (!/^\d{5}$/.test(code)) {
                return res.render('add-bank', { errorMessage: 'Bank code should be exactly 5 digits.' });
            }
    
            // Check if the bank name or code already exists
            const nameQuery = 'SELECT * FROM bank WHERE LOWER(name) = LOWER($1)';
            const codeQuery = 'SELECT * FROM bank WHERE code = $1';
    
            const nameResult = await pool.query(nameQuery, [name]);
            const codeResult = await pool.query(codeQuery, [code]);
    
            if (nameResult.rows.length > 0) {
                // Bank name already exists
                return res.render('add-bank',  { req , errorMessage: 'Bank name already exists.' });
            }
    
            if (codeResult.rows.length > 0) {
                // Bank code already exists
                return res.render('add-bank', {req, errorMessage: 'Bank code already exists.' });
            }
    
            // Insert new bank if no duplicates are found
            const insertQuery = 'INSERT INTO bank (name, code) VALUES ($1, $2)';
            await pool.query(insertQuery, [name, code]);
    
            // Redirect to the bank list or another page after successful insertion
            res.redirect('/banks');
        } catch (error) {
            console.error('Error adding bank:', error);
            res.render('add-bank', { req, errorMessage: 'An error occurred while adding the bank.' });
        }
    });
    
    
    
    
    
    
   
    router.get('/banks/edit/:code',ensureAdmin, async (req, res) => {
     
        const bankCode = req.params.code;
    
        try {
            const result = await pool.query('SELECT * FROM bank WHERE code = $1', [bankCode]);
            const bank = result.rows[0];
            res.render('edit-bank', { bank ,req });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    

    
    router.post('/banks/edit/:code', ensureAdmin, async (req, res) => {
        const bankCode = req.params.code;
        const { name } = req.body;
    
        try {
            // Check if the new bank name already exists
            const nameExistsQuery = 'SELECT * FROM bank WHERE name = $1 AND code != $2';
            const nameExistsResult = await pool.query(nameExistsQuery, [name, bankCode]);
    
            if (nameExistsResult.rows.length > 0) {
                // Bank name already exists
                return res.render('edit-bank', {
                    bank: { code: bankCode, name},
                    req,
                    errorMessage: 'Bank name already exists. Please choose a different name.'
                });
            }
    
            // Update bank details if no conflicts
            const updateQuery = 'UPDATE bank SET name = $1 WHERE code = $2';
            await pool.query(updateQuery, [name, bankCode]);
    
            res.redirect('/banks'); // Redirect to the bank list or another page
        } catch (err) {
            console.error('Error updating bank:', err.message);
            res.render('edit-bank', {
                bank: { code: bankCode, name },
                req,
                errorMessage: 'An error occurred while updating the bank.'
            });
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
            res.render('accounts', { accounts ,req });
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
        res.render('add-account', { banks ,req , error_msg: req.flash('error_msg')});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/add-account', ensureAdmin, async (req, res) => {
    const { bankCode, accountNum } = req.body;

    // Check if the account number is exactly 11 digits long
    const accountNumRegex = /^\d{11}$/;
    if (!accountNumRegex.test(accountNum)) {
        req.flash('error_msg', 'Account number must be exactly 11 digits long.');
        return res.redirect('/add-account'); // Redirect back to the form with an error message
    }

    try {
        // Check if the account number already exists
        const accountCheckResult = await pool.query('SELECT num FROM account WHERE num = $1', [accountNum]);
        if (accountCheckResult.rows.length > 0) {
            req.flash('error_msg', 'Account number already exists.');
            return res.redirect('/add-account');
        }

        // Insert the new account into the database
        await pool.query(
            'INSERT INTO account (num, bankCode) VALUES ($1, $2)',
            [accountNum, bankCode]
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

        res.render('edit-account', { account, req, banks: banksResult.rows });
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

/* router.get('/emission', ensureAuthenticated, async (req, res) => {
    try {
        const { rows: checks } = await pool.query(`
            SELECT num, amount, beneficiary, creationDate, valueDate, entryDate, issueDate, type, bankCode, accountNum, createdBy, updatedBy
            FROM cheque
            WHERE supprime = false
        `);

        // Check if req.user exists and log its contents
  
       // console.log(req.user.role);
        res.render('emission', { 
            checks,
            userRole: req.user ? req.user.role : 'guest' // Pass the user's role to the template
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}); */

router.get('/emission', ensureAuthenticated, async (req, res) => {
  console.log(req.user.role);
    try {
        const { rows: checks } = await pool.query(`
            SELECT c.num, c.amount, c.beneficiary, c.creationDate, c.valueDate, c.entryDate, c.issueDate, c.type, 
                   c.bankCode, c.accountNum, c.createdBy, c.updatedBy,c.lastupdatedby, b.name AS bankName
            FROM cheque c
            LEFT JOIN bank b ON c.bankCode = b.code
            WHERE c.supprime = false
        `);

        res.render('emission', { 
            checks,
            req
            //userRole: req.user ? req.user.role : 'guest' // Pass the user's role to the template
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
        res.render('add-check', { banks,req });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}); 
router.post('/add-check', ensureAgentOrAdmin, async (req, res) => {
    const { amount, beneficiary, valueDate, bankCode, accountNum, type } = req.body;

    try {
        // Check if the amount is provided and valid
        if (!amount || amount <= 0) {
            // Fetch the banks again to pass them back to the form
            const bankResult = await pool.query('SELECT code, name FROM bank WHERE supprime = false');
            const banks = bankResult.rows;

            return res.render('add-check', {
                banks, // Pass the banks array to the view again
                errorMessage: 'Amount is required and must be greater than zero.',
                req
            });
        }

        const year = new Date().getFullYear();
        const { rows } = await pool.query('SELECT MAX(num) AS maxnum FROM cheque');
        
        // Convert maxnum to string and handle the case where it might be null
        let nextNum = rows[0].maxnum ? parseInt(String(rows[0].maxnum).slice(4)) + 1 : 1;
        const formattedNum = `${year}${nextNum.toString().padStart(6, '0')}`;

        // Set valueDate to null if it's not provided
        const dateValue = valueDate ? valueDate : null;
        // Insert the new check into the database
        await pool.query(
            `INSERT INTO cheque (num, amount, beneficiary, valueDate, bankCode, accountNum, type, createdBy) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [formattedNum, amount, beneficiary, dateValue, bankCode, accountNum, type, req.user.fullname]
        );

        res.redirect('/emission');
    } catch (err) {
        console.error(err);
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

/*** router.post('/add-check', ensureAgentOrAdmin, async (req, res) => {
    const { amount, beneficiary, valueDate, bankCode, accountNum, type } = req.body;

    try {
        // Check if the amount is provided
        if (!amount || amount <= 0) {
            return res.render('add-check', {
                errorMessage: 'Amount is required and must be greater than zero.'
            });
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
            [formattedNum, amount, beneficiary, valueDate, bankCode, accountNum, type, req.user.fullname]
        );

        res.redirect('/emission');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}); ***/
/* router.post('/add-check', ensureAgentOrAdmin, async (req, res) => {
    const { amount, beneficiary, valueDate, bankCode, accountNum, type } = req.body;

    try {
        // Check if the amount is provided and valid
        if (!amount || amount <= 0) {
            return res.status(400).send('Amount is required and must be greater than zero.');
        }

        const year = new Date().getFullYear();
        const { rows } = await pool.query('SELECT MAX(num) AS maxnum FROM cheque');
        
        // Calculate the next check number
        let nextNum = rows[0].maxnum ? parseInt(String(rows[0].maxnum).slice(4)) + 1 : 1;
        const formattedNum = `${year}${nextNum.toString().padStart(6, '0')}`;

        // Set valueDate to null if it's not provided
        const dateValue = valueDate ? valueDate : null;

        // Insert the new check into the database
        await pool.query(
            `INSERT INTO cheque (num, amount, beneficiary, valueDate, bankCode, accountNum, type, createdBy) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [formattedNum, amount, beneficiary, dateValue, bankCode, accountNum, type, req.user.fullname]
        );

        res.redirect('/emission');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}); */







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
            req,
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching check details:', error);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
}); 


// Route for updating a check by an admin
/* router.post('/checks/update/admin/:num', ensureAdmin, async (req, res) => {
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
}); */
router.post('/checks/update/admin/:num', ensureAdmin, async (req, res) => {
    const checkNum = req.params.num;
    const { amount, beneficiary, valueDate, bankCode, accountNum, entryDate, issueDate, type } = req.body;
    const updatedBy = req.user ? req.user.fullname : undefined;

    try {
        // Update the check details in the database
        const updateQuery = `
            UPDATE cheque
            SET 
                amount = $1,
                beneficiary = $2,
                valueDate = $3::date,
                bankCode = $4,
                accountNum = $5,
                entryDate = $6::date,
                issueDate = $7::date,
                type = $8,
                updatedBy = $9,
                lastUpdatedBy = CASE 
                    WHEN $7 IS NOT NULL THEN $10 
                    ELSE lastUpdatedBy 
                END
            WHERE num = $11
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
            req.user.fullname,
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
                updatedBy = $6,
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

 /*router.post('/checks/update/cashier/:num',ensureCashier,ensureCheckNotIssued, async (req, res) => {
      const checkNum = parseInt(req.params.num, 10);
      const { entryDate, issueDate, type } = req.body;
      const updatedBy = req.user ? req.user.fullname : undefined;
  
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
  
  }); */
 /*  router.post('/checks/update/cashier/:num', ensureCashier, async (req, res) => {
    const checkNum = parseInt(req.params.num, 10);
    const { entryDate, issueDate, type } = req.body;
    const updatedBy = req.user ? req.user.fullname : undefined;

    try {
        await pool.query(`
            UPDATE cheque
            SET 
                entryDate = $1::date,
                issueDate = $2::date,
                type = $3,
                updatedBy = $4,
                lastUpdatedBy = CASE 
                    WHEN $2 IS NOT NULL THEN $5 
                    ELSE lastUpdatedBy 
                END
            WHERE num = $6
        `, [entryDate, issueDate, type, updatedBy, req.user.fullname, checkNum]);

        res.redirect('/emission');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
}); */
router.post('/checks/update/cashier/:num', ensureCashier, async (req, res) => {
    const checkNum = parseInt(req.params.num, 10);
    const { entryDate, issueDate, type } = req.body;
    const updatedBy = req.user ? req.user.fullname : undefined;

    try {
        await pool.query(`
            UPDATE cheque
            SET 
                entryDate = $1::date,
                issueDate = $2::date,
                type = $3,
                updatedBy = $4,
                lastUpdatedBy = CASE 
                    WHEN $2 IS NOT NULL THEN $5 
                    ELSE lastUpdatedBy 
                END
            WHERE num = $6
        `, [
            entryDate || null,     // Set to null if not provided
            issueDate || null,     // Set to null if not provided
            type || null,          // Set to null if not provided
            updatedBy,
            req.user.fullname,
            checkNum
        ]);

        res.redirect('/emission');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});




router.post('/checks/delete/:num',ensureCheckNotIssued , ensureAgentOrAdmin, async (req, res) => {
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
  
    const { creationDate, valueDate, entryDate, issueDate, type ,status } = req.query;
    console.log('Status:', status);
    
    try {
      const filteredChecks = await getFilteredChecks({ creationDate, valueDate, entryDate, issueDate, type,status});
      res.render('search-results', {
        filteredChecks,
        req,
        query: req.query,
       
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("There was an error fetching the filtered checks.");
    }
});

router.get('/download-pdf', async (req, res) => {
    const { creationDate, valueDate, entryDate, issueDate, type, status } = req.query;

    try {
        const filteredChecks = await getFilteredChecks({ creationDate, valueDate, entryDate, issueDate, type, status });
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
        const tableHeaders = ['Account Number', 'Amount', 'Beneficiary', 'Type', 'Status'];
        const columnWidths = [120, 100, 150, 80, 100];
        
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
                check.type ? check.type.toString() : 'N/A',
                check.status ? check.status.toString() : 'N/A'  // Add status to the row
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