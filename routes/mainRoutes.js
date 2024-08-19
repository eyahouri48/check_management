// routes/mainRoutes.js
import PDFDocument from 'pdfkit';
import express from 'express';
import ensureCheckNotIssued from '../check/check.js';
import ensureAdmin from '../privileges/admin.js';
import ensureAdminOrAgent from '../privileges/adminOrAgent.js';
import ensureAdminOrCashier from '../privileges/adminOrCashier.js';
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
    function ensureAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect('/login');
    }

    router.get('/', ensureAuthenticated, (req, res) => {
        //console.log(req.user.iduser);
        const userRole = req.user.function ? req.user.function : 'Undefined'; 
        res.render('dashboard', {userRole});
    });

    router.get('/dashboard', ensureAuthenticated, (req, res) => {
        const userRole = req.user.function ? req.user.function : 'Undefined'; 
        console.log(userRole);
        res.render('dashboard',{userRole});
    });

    router.get('/checks', ensureAuthenticated, (req, res) => {
        res.render('checks');
    });

    router.get('/404', (req, res) => {
        res.render('404');
    });

    router.get('/charts', ensureAuthenticated, (req, res) => {
        res.render('charts');
    });

    router.get('/tables', ensureAuthenticated, (req, res) => {
        res.render('tables');
    });

    router.get('/login', (req, res) => {
        const message = req.flash('error');
        res.render('login', { message });
    });

    router.get('/banks', ensureAuthenticated, ensureAdmin ,async (req, res) => {
        try {
            const result = await pool.query('SELECT code, name FROM bank WHERE supprime = false');
            const banks = result.rows;
            res.render('banks', { banks });
        } catch (err) {
            console.error(err);
            res.status(500).send("Error retrieving banks from database.");
        }
    });
    
    router.get('/add/bank', ensureAdmin, (req, res) => {
        res.render('add-bank');
    });
    

    router.post('/banks/add', ensureAdmin, async (req, res) => {
        const { name } = req.body;
    
        try {
           
            const result = await pool.query('SELECT * FROM bank WHERE LOWER(name) = LOWER($1)', [name]);
            
            if (result.rows.length > 0) {
                
                return res.status(400).send('Bank with this name already exists.');
            }
    
            
            await pool.query('INSERT INTO bank (name) VALUES ($1)', [name]);
            res.redirect('/banks');
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    
    
   
    router.get('/banks/edit/:code', ensureAdmin,async (req, res) => {
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

    
router.post('/banks/delete/:code', ensureAdmin, async (req, res) => {
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
router.get('/accounts', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT num, bankcode FROM account WHERE supprime = false');
        const accounts = result.rows;
        res.render('accounts', { accounts });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error retrieving banks from database.");
    }
});

router.get('/add-account', ensureAdmin, async (req, res) => {
    try {
        // Fetch all bank codes from the Bank table
        const result = await pool.query('SELECT code, name FROM bank WHERE supprime = false');
        const banks = result.rows;

        // Render the add-account page with the list of banks
        res.render('add-account', { banks });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

  

  router.post('/add-account', ensureAdmin, async (req, res) => {
    const { bankCode } = req.body;
    try {
      await pool.query(
        'INSERT INTO account (bankCode) VALUES ($1) RETURNING *',
        [bankCode]
      );
      res.redirect('/accounts');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });
   // GET route to display the edit form
router.get('/accounts/edit/:num', ensureAdmin, async (req, res) => {
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
router.post('/accounts/delete/:num', ensureAdmin,  async (req, res) => {
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
/* router.get('/emission', async (req, res) => {
    try {
        // Fetch all active (not deleted) checks
        const { rows: checks } = await pool.query('SELECT * FROM cheque WHERE supprime = false');
        
        res.render('emission', { checks });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}); */
/*router.get('/emission', async (req, res) => {
    try {
        // Fetch all active (not deleted) checks along with their creation dates
        const { rows: checks } = await pool.query('SELECT num, amount, beneficiary, creationDate FROM cheque WHERE supprime = false');
        
        res.render('emission', { checks });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});*/
/* router.get('/emission', async (req, res) => {
    try {
        // Fetch all relevant columns for checks, even if some are null
        const { rows: checks } = await pool.query(`
            SELECT num, amount, beneficiary, creationDate, valueDate, entryDate, issueDate, type, bankCode, accountNum, createdBy, updatedBy
            FROM cheque
            WHERE supprime = false
        `);
        
        res.render('emission', { checks });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}); */
router.get('/emission', async (req, res) => {
    try {
        // Fetch all relevant columns for checks, even if some are null
        const { rows: checks } = await pool.query(`
            SELECT num, amount, beneficiary, creationDate, valueDate, entryDate, issueDate, type, bankCode, accountNum, createdBy, updatedBy
            FROM cheque
            WHERE supprime = false
        `);

        // Retrieve user role from the session
        const userRole = req.user.function ? req.user.function : 'Undefined'; // Adjust this according to how you store the role
        console.log(userRole);
        // Render the view with checks and user role
        res.render('emission', { checks, userRole });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


// Route to fetch the bank code based on account number
router.get('/get-bank-code', async (req, res) => {
    const { accountNum } = req.query;
    try {
        const { rows } = await pool.query('SELECT bankCode FROM account WHERE num = $1', [accountNum]);
        if (rows.length > 0) {
            res.json({ bankCode: rows[0].bankcode });
        } else {
            res.status(404).send('Account not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/add-check', ensureAdminOrAgent, (req, res) => {
    res.render('add-check');
});

router.post('/add-check', ensureAdminOrAgent, async (req, res) => {
    const { amount, beneficiary, valueDate, bankCode, accountNum } = req.body;
    try {
        // Check if the accountNum already exists with a different beneficiary
        const existingCheck = await pool.query(
            'SELECT * FROM cheque WHERE accountNum = $1 AND beneficiary != $2',
            [accountNum, beneficiary]
        );

        if (existingCheck.rows.length > 0) {
            // If an accountNum already has a different beneficiary, return an error
            return res.status(400).send('This account number is already associated with a different beneficiary.');
        }

        const year = new Date().getFullYear();
        const { rows } = await pool.query('SELECT MAX(num) AS maxnum FROM cheque');
        
        // Convert maxnum to string and handle the case where it might be null
        let nextNum = rows[0].maxnum ? parseInt(String(rows[0].maxnum).slice(4)) + 1 : 1;
        const formattedNum = `${year}${nextNum.toString().padStart(6, '0')}`;

        await pool.query(
            `INSERT INTO cheque (num, amount, beneficiary, valueDate, bankCode, accountNum, createdBy) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [formattedNum, amount, beneficiary, valueDate, bankCode, accountNum, req.user.iduser]
        );

        res.redirect('/emission');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.post('/checks/delete/:num',ensureCheckNotIssued , ensureAdminOrAgent, async (req, res) => {
    const { num } = req.params;
  
    try {
   
      await pool.query('UPDATE cheque SET supprime = true WHERE num = $1', [num]);
  
    
      res.redirect('/emission');
    } catch (err) {
      console.error('Error deleting check:', err);
      res.status(500).send('Server Error');
    }
  });



router.get('/checks/edit/:num',ensureCheckNotIssued,ensureAdminOrCashier, async (req, res) => {
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

  
  router.post('/checks/update/:num',ensureAdminOrCashier, async (req, res) => {
    if (req.query._method === 'PUT') {
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
    } else {
      res.status(405).send('Method Not Allowed');
    }
  });
  router.post('/checks/set-to-zero/:num', ensureCheckNotIssued,ensureAdminOrAgent, async (req, res) => {
    const { num } = req.params;
  
    try {
    
      await pool.query('UPDATE cheque SET amount = 0 WHERE num = $1', [num]);
  
      
      res.redirect('/emission');
    } catch (err) {
      console.error('Error setting check amount to 0:', err);
      res.status(500).send('Server Error');
    }
  });
  
  router.get('/search-results', async (req, res) => {
    const { creationDate, valueDate, entryDate, issueDate, type } = req.query;
  
    try {
      const filteredChecks = await getFilteredChecks({ creationDate, valueDate, entryDate, issueDate, type });
      res.render('search-results', {
        filteredChecks,
        query: req.query // Pass the query parameters to the view
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