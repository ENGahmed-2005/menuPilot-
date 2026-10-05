<?php

namespace App\Support\Export;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use RuntimeException;
use ZipArchive;

/**
 * Minimal streaming XLSX (Office Open XML) writer — no extra dependency.
 *
 * Rows are appended to a temporary file as they are produced, so memory use
 * stays flat for large exports; the workbook is zipped once at the end.
 * Real cell types: numbers/money/integers are numeric, dates/times are Excel
 * serial dates with a display format, text is inline UTF-8 (Arabic safe).
 * Header row is styled, frozen and filterable; widths follow the content;
 * the sheet is right-to-left; an optional bold totals row closes the sheet.
 *
 * Column definition: ['key' => 'total', 'header' => 'الإجمالي', 'type' => 'money', 'sum' => true]
 * Types: string | int | number | money | date | time | datetime
 */
class XlsxWriter
{
    private const STYLE = ['string' => 0, 'int' => 2, 'number' => 3, 'money' => 4, 'date' => 5, 'time' => 6, 'datetime' => 7];

    private $rowsHandle;

    private string $rowsPath;

    private int $rowIndex = 1; // 1 = header

    private array $widths = [];

    private array $sums = [];

    public function __construct(private string $sheetTitle, private array $columns, private string $currencySymbol = '₪', private bool $rightToLeft = true)
    {
        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException('The PHP zip extension is required for XLSX export.');
        }
        $this->rowsPath = tempnam(sys_get_temp_dir(), 'mpx');
        $this->rowsHandle = fopen($this->rowsPath, 'w');

        $cells = '';
        foreach ($this->columns as $i => $col) {
            $this->widths[$i] = mb_strlen($col['header']);
            $cells .= '<c r="'.self::ref($i, 1).'" t="inlineStr" s="1"><is><t xml:space="preserve">'.self::xml($col['header']).'</t></is></c>';
        }
        fwrite($this->rowsHandle, '<row r="1" ht="22" customHeight="1">'.$cells.'</row>');
    }

    /** Append one row: values keyed by column 'key'. Missing/null → empty cell. */
    public function addRow(array $values): void
    {
        $r = ++$this->rowIndex;
        $cells = '';
        foreach ($this->columns as $i => $col) {
            $value = $values[$col['key']] ?? null;
            if ($value === null || $value === '') {
                continue;
            }
            $cells .= $this->cell($i, $r, $value, $col['type'] ?? 'string', false);
            if (! empty($col['sum']) && is_numeric($value)) {
                $this->sums[$i] = ($this->sums[$i] ?? 0) + (float) $value;
            }
        }
        fwrite($this->rowsHandle, '<row r="'.$r.'">'.$cells.'</row>');
    }

    public function rowCount(): int
    {
        return $this->rowIndex - 1;
    }

    /** Write the workbook and return the path of the .xlsx file (caller deletes it). */
    public function finish(?string $summaryLabel = 'الإجمالي'): string
    {
        $lastDataRow = $this->rowIndex;
        $lastCol = self::letters(count($this->columns) - 1);

        if ($summaryLabel !== null && $this->sums && $this->rowCount() > 0) {
            $r = $this->rowIndex + 1;
            $cells = '<c r="'.self::ref(0, $r).'" t="inlineStr" s="8"><is><t xml:space="preserve">'.self::xml($summaryLabel).'</t></is></c>';
            foreach ($this->columns as $i => $col) {
                if ($i > 0 && isset($this->sums[$i])) {
                    $cells .= $this->cell($i, $r, round($this->sums[$i], 4), $col['type'], true);
                }
            }
            fwrite($this->rowsHandle, '<row r="'.$r.'">'.$cells.'</row>');
        }
        fclose($this->rowsHandle);

        $cols = '';
        foreach ($this->columns as $i => $col) {
            $width = min(60, max(10, $this->widths[$i] + 3));
            $cols .= '<col min="'.($i + 1).'" max="'.($i + 1).'" width="'.$width.'" customWidth="1"/>';
        }
        $rtl = $this->rightToLeft ? ' rightToLeft="1"' : '';

        $sheetPath = tempnam(sys_get_temp_dir(), 'mps');
        $sheet = fopen($sheetPath, 'w');
        fwrite($sheet, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<dimension ref="A1:'.$lastCol.max(1, $this->rowIndex + ($this->sums ? 1 : 0)).'"/>'
            .'<sheetViews><sheetView workbookViewId="0"'.$rtl.'><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>'
            .'<sheetFormatPr defaultRowHeight="15"/><cols>'.$cols.'</cols><sheetData>');
        $rows = fopen($this->rowsPath, 'r');
        stream_copy_to_stream($rows, $sheet);
        fclose($rows);
        fwrite($sheet, '</sheetData><autoFilter ref="A1:'.$lastCol.$lastDataRow.'"/><pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>');
        fclose($sheet);
        @unlink($this->rowsPath);

        $title = self::sheetName($this->sheetTitle);
        $xlsxPath = tempnam(sys_get_temp_dir(), 'mpw').'.xlsx';
        $zip = new ZipArchive;
        if ($zip->open($xlsxPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Could not create the XLSX file.');
        }
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>');
        $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
        $zip->addFromString('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>'.self::xml($this->sheetTitle).'</dc:title><dc:creator>menuPilot</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'.gmdate('Y-m-d\TH:i:s\Z').'</dcterms:created></cp:coreProperties>');
        $zip->addFromString('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>menuPilot</Application></Properties>');
        $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
        $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="'.self::xml($title).'" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\''.self::xml(str_replace("'", "''", $title)).'\'!$A$1:$'.$lastCol.'$'.$lastDataRow.'</definedName></definedNames></workbook>');
        $zip->addFromString('xl/styles.xml', $this->styles());
        $zip->addFile($sheetPath, 'xl/worksheets/sheet1.xml');
        $zip->close();
        @unlink($sheetPath);

        return $xlsxPath;
    }

    private function cell(int $col, int $row, $value, string $type, bool $bold): string
    {
        $ref = self::ref($col, $row);
        $style = self::STYLE[$type] ?? 0;
        if ($bold) {
            $style = ['money' => 9, 'int' => 10, 'number' => 11][$type] ?? 8;
        }

        if (in_array($type, ['int', 'number', 'money'], true) && is_numeric($value)) {
            $text = $type === 'int' ? (string) (int) $value : rtrim(rtrim(number_format((float) $value, 4, '.', ''), '0'), '.');
            $this->track($col, number_format((float) $value, $type === 'int' ? 0 : 2).' '.$this->currencySymbol);

            return '<c r="'.$ref.'" s="'.$style.'"><v>'.$text.'</v></c>';
        }
        if (in_array($type, ['date', 'time', 'datetime'], true) && ($serial = self::serial($value, $type)) !== null) {
            $this->track($col, $type === 'datetime' ? '0000-00-00 00:00' : ($type === 'time' ? '00:00' : '0000-00-00'));

            return '<c r="'.$ref.'" s="'.$style.'"><v>'.$serial.'</v></c>';
        }

        $text = (string) $value;
        $this->track($col, $text);

        return '<c r="'.$ref.'" t="inlineStr" s="'.($bold ? 8 : 0).'"><is><t xml:space="preserve">'.self::xml($text).'</t></is></c>';
    }

    private function track(int $col, string $text): void
    {
        $this->widths[$col] = max($this->widths[$col] ?? 0, mb_strlen($text));
    }

    /** Excel serial date in the app timezone (what the restaurant sees). */
    private static function serial($value, string $type): ?string
    {
        try {
            $dt = $value instanceof CarbonInterface ? $value->copy() : Carbon::parse((string) $value);
        } catch (\Throwable) {
            return null;
        }
        $dt = $dt->setTimezone(config('app.timezone', 'UTC'));
        $days = ($dt->getTimestamp() + $dt->getOffset()) / 86400 + 25569;
        if ($type === 'date') {
            $days = floor($days);
        } elseif ($type === 'time') {
            $days -= floor($days);
        }

        return rtrim(rtrim(number_format($days, 8, '.', ''), '0'), '.');
    }

    private function styles(): string
    {
        $money = '#,##0.00 &quot;'.self::xml($this->currencySymbol).'&quot;';

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<numFmts count="4"><numFmt numFmtId="164" formatCode="'.$money.'"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/><numFmt numFmtId="166" formatCode="hh:mm"/><numFmt numFmtId="167" formatCode="yyyy-mm-dd hh:mm"/></numFmts>'
            .'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
            .'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4EFE6"/><bgColor indexed="64"/></patternFill></fill></fills>'
            .'<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF1F2D3D"/></bottom><diagonal/></border></borders>'
            .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            .'<cellXfs count="12">'
            .'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            .'<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
            .'<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
            .'<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
            .'<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
            .'<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
            .'<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
            .'<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
            .'<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
            .'<xf numFmtId="164" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>'
            .'<xf numFmtId="3" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>'
            .'<xf numFmtId="4" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>'
            .'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    }

    public static function letters(int $index): string
    {
        $s = '';
        for ($n = $index + 1; $n > 0; $n = intdiv($n - 1, 26)) {
            $s = chr(65 + (($n - 1) % 26)).$s;
        }

        return $s;
    }

    private static function ref(int $col, int $row): string
    {
        return self::letters($col).$row;
    }

    /** Escape and drop characters XML 1.0 can't carry. */
    private static function xml(string $text): string
    {
        $text = preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $text) ?? '';

        return htmlspecialchars($text, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    /** Excel sheet names: max 31 chars, no []:*?/\ */
    private static function sheetName(string $name): string
    {
        return mb_substr(trim(preg_replace('/[\[\]:*?\/\\\\]/u', ' ', $name)) ?: 'Sheet1', 0, 31);
    }
}
