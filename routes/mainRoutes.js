// routes/mainRoutes.js
import PDFDocument from 'pdfkit';
import express from 'express';
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
        res.render('dashboard', { title: "management" });
    });

    router.get('/dashboard', ensureAuthenticated, (req, res) => {
        res.render('dashboard', { title: "management" });
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

    router.get('/banks', ensureAuthenticated, async (req, res) => {
        try {
            const result = await pool.query('SELECT code, name FROM bank WHERE supprime = false');
            const banks = result.rows;
            res.render('banks', { banks });
        } catch (err) {
            console.error(err);
            res.status(500).send("Error retrieving banks from database.");
        }
    });
    
    router.get('/add/bank', (req, res) => {
        res.render('add-bank');
    });
    
    // Route to handle form submission for adding a new bank
   router.post('/banks/add', async (req, res) => {
        const { name } = req.body; // name only , the code will be auto-generated just like account
    
        try {
            await pool.query('INSERT INTO bank (name) VALUES ($1)', [name]);
            res.redirect('/banks'); // Redirect to the view banks page after adding
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }); 
   
    router.get('/banks/edit/:code', async (req, res) => {
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
    
    // Route to handle form submission for editing a bank
     router.post('/banks/edit/:code', async (req, res) => {
        const bankCode = req.params.code;
        const { name } = req.body;
    
        try {
            await pool.query('UPDATE bank SET name = $1 WHERE code = $2', [name, bankCode]);
            res.redirect('/banks'); // Redirect to the view banks page after editing
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // Route to handle deletion of a bank by setting 'supprime' to true
router.post('/banks/delete/:code', async (req, res) => {
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
router.get('/accounts', ensureAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT num, bankcode FROM account WHERE supprime = false');
        const accounts = result.rows;
        res.render('accounts', { accounts });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error retrieving banks from database.");
    }
});

router.get('/add-account', async (req, res) => {
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

  
  // Handle the form submission to add a new account
  router.post('/add-account', async (req, res) => {
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
router.get('/accounts/edit/:num', async (req, res) => {
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

// POST route to update the account
router.post('/accounts/edit/:num', async (req, res) => {
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
router.post('/accounts/delete/:num', async (req, res) => {
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
router.get('/emission', async (req, res) => {
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

router.get('/add-check', (req, res) => {
    res.render('add-check');
});

router.post('/add-check', async (req, res) => {
    console.log(req);
    const { amount, beneficiary, valueDate, bankCode, accountNum } = req.body;
    try {
        const year = new Date().getFullYear();
        const { rows } = await pool.query('SELECT MAX(num) AS maxnum FROM cheque');
        console.log("Maxnum:", rows[0].maxnum);
        
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

// GET: Edit a specific check
router.get('/checks/edit/:num', async (req, res) => {
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

  
  // PUT: Update a specific check
  router.post('/checks/update/:num', async (req, res) => {
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
  
  // route to handle the search
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

        const doc = new PDFDocument({ margin: 50 });
        let filename = 'filtered-checks.pdf';
        filename = encodeURIComponent(filename);

        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Draw a border and title
        doc.rect(50, 40, doc.page.width - 100, 40).stroke();
        doc.fontSize(20).text('Overview of Filtered Checks', { align: 'center' }).moveDown(2);

        // Set up table headers
        const tableTop = 100;
        const itemX = 50;
        const amountX = 150;
        const beneficiaryX = 250;
        const typeX = 400;

        doc.fontSize(12)
            .text('Account Number', itemX, tableTop, { bold: true })
            .text('Amount', amountX, tableTop)
            .text('Beneficiary', beneficiaryX, tableTop)
            .text('Type', typeX, tableTop);

        let i;
        const rowGap = 20;
        const lineHeight = 20;

        for (i = 0; i < filteredChecks.length; i++) {
            const check = filteredChecks[i];
            const y = tableTop + (i + 1) * lineHeight;

            doc.fontSize(10)
                .text(check.accountnum, itemX, y)
                .text(check.amount, amountX, y)
                .text(check.beneficiary, beneficiaryX, y)
                .text(check.type, typeX, y);

            // Draw horizontal line between rows
            doc.moveTo(itemX, y + rowGap).lineTo(typeX + 100, y + rowGap).stroke();
        }

        // Print date at the end
        doc.moveDown(2);
        doc.fontSize(10).text(`Printed on: ${new Date().toLocaleString()}`, {
            align: 'right',
            lineGap: 10
        });

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