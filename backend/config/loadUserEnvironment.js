const { execFileSync } = require('node:child_process');

const userEnvironmentKeys = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'DB_PORT',
    'JWT_SECRET',
];

function loadUserEnvironment() {
    if (process.platform !== 'win32') {
        return;
    }

    const keys = userEnvironmentKeys.map((key) => `'${key}'`).join(', ');
    const script = [
        `$keys = @(${keys})`,
        '$values = @{}',
        'foreach ($key in $keys) {',
        "    $value = [Environment]::GetEnvironmentVariable($key, 'User')",
        '    if ($null -ne $value) { $values[$key] = $value }',
        '}',
        '$json = ConvertTo-Json -InputObject $values -Compress',
        '[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))',
    ].join('; ');

    let values;
    try {
        const output = execFileSync('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            script,
        ], {
            encoding: 'utf8',
            windowsHide: true,
        }).trim();
        values = JSON.parse(Buffer.from(output, 'base64').toString('utf8'));
    } catch (error) {
        throw new Error(`Could not load Windows user environment variables: ${error.message}`);
    }

    for (const key of userEnvironmentKeys) {
        if (!process.env[key] && values[key]) {
            process.env[key] = values[key];
        }
    }
}

module.exports = loadUserEnvironment;
