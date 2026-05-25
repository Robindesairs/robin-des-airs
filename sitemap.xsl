<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="fr">
    <head>
      <meta charset="UTF-8"/>
      <title>Sitemap — Robin des Airs</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 24px; color: #0B1F3A; }
        h1 { font-size: 1.25rem; }
        table { border-collapse: collapse; width: 100%; margin-top: 16px; }
        th, td { border: 1px solid #E2E4E8; padding: 8px 10px; text-align: left; font-size: 13px; }
        th { background: #F3F4F6; }
        a { color: #007A4C; word-break: break-all; }
        p.note { color: #6B7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>Sitemap Robin des Airs</h1>
      <p class="note">Fichier XML valide pour Google. Ne pas coller cette page dans Search Console — indiquer seulement <code>sitemap.xml</code>.</p>
      <table>
        <tr><th>URL</th><th>Dernière modif.</th><th>Fréquence</th><th>Priorité</th></tr>
        <xsl:for-each select="s:urlset/s:url">
          <tr>
            <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
            <td><xsl:value-of select="s:lastmod"/></td>
            <td><xsl:value-of select="s:changefreq"/></td>
            <td><xsl:value-of select="s:priority"/></td>
          </tr>
        </xsl:for-each>
      </table>
    </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
